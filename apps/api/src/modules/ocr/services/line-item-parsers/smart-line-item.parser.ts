import { Logger } from '@nestjs/common';
import { LineItemParser } from '../../interfaces/line-item-parser.interface';
import { ReceiptLineItem } from '../../interfaces/ocr-result.interface';

/**
 * 行分類類型
 */
export enum LineType {
  /** 合計/總計行 */
  TOTAL = 'TOTAL',
  /** 折扣/優惠行 */
  DISCOUNT = 'DISCOUNT',
  /** 價格明細行（$單價×數量 $小計） */
  PRICE_DETAIL = 'PRICE_DETAIL',
  /** 品項+金額同行 */
  ITEM_WITH_PRICE = 'ITEM_WITH_PRICE',
  /** 僅品名（無金額） */
  ITEM_NAME_ONLY = 'ITEM_NAME_ONLY',
  /** 分隔線 */
  SEPARATOR = 'SEPARATOR',
  /** 後設資料（統編、地址、找零等） */
  METADATA = 'METADATA',
}

/**
 * 分類後的行
 */
export interface ClassifiedLine {
  text: string;
  type: LineType;
  /** 從 PRICE_DETAIL 提取的單價 */
  unitPrice?: number;
  /** 從 PRICE_DETAIL 提取的數量 */
  quantity?: number;
  /** 從 PRICE_DETAIL 或 ITEM_WITH_PRICE 提取的小計 */
  subtotal?: number;
}

/**
 * 收據品項格式
 */
export enum ReceiptFormat {
  /** 雙行式：品名一行、$單價×數量 $小計另一行 */
  TWO_LINE = 'TWO_LINE',
  /** 單行式：品名和金額在同一行 */
  SINGLE_LINE = 'SINGLE_LINE',
  /** 混合式 */
  MIXED = 'MIXED',
}

/**
 * 智慧通用品項解析器
 *
 * 透過「行分類 → 模式偵測 → 品項提取」三步驟，
 * 自動適配便利商店、超市、餐廳、普通發票等多種收據格式。
 */
export class SmartLineItemParser implements LineItemParser {
  readonly name = 'SmartLineItemParser';
  readonly priority = 10;

  private readonly logger = new Logger(SmartLineItemParser.name);

  // ===== 行分類正則 =====

  /** 合計/總計關鍵字 */
  private readonly TOTAL_KEYWORDS =
    /(?:^|[\s$])(?:合\s*計|總\s*計|小\s*計|應付金額|應付|實付金額|實付|付款金額|總額|總金額|金額)/;

  /** 折扣行：含 $-N 的負金額 */
  private readonly DISCOUNT_PATTERN = /\$\s*-\s*\d+/;

  /** 折扣關鍵字 */
  private readonly DISCOUNT_KEYWORDS = /折扣|優惠|折抵|減免|折讓|紅利|點數折/;

  /** 價格明細行：$單價 × 數量 $小計 */
  private readonly PRICE_DETAIL_PATTERNS = [
    // $59x 2  $118 TX — 便利商店典型格式
    /\$(\d+)\s*[xX×]\s*(\d+)\s+\$(\d+)/,
    // $59x2 $118
    /\$(\d+)\s*[xX×]\s*(\d+)\s*\$(\d+)/,
    // 59 x 2 = 118 或 59×2 118
    /(\d+)\s*[xX×]\s*(\d+)\s*[=＝]?\s*(\d+)/,
  ];

  /** 後設資料關鍵字 */
  private readonly METADATA_KEYWORDS =
    /統一編號|統編|賣方|買方|地址|電話|TEL|FAX|找零|現金|信用卡|刷卡|悠遊卡|LINE\s*Pay|載具|會員|累點|GID|OPEN\s*POINT|退貨|營業人|營利事業|機[號台]|收銀員|交易序號|交易時間|店[名號]|發票|中獎/i;

  /** 分隔線 */
  private readonly SEPARATOR_PATTERN = /^[-=＝─━﹣*＊.]{3,}$/;

  /** 中文字元 */
  private readonly CHINESE_CHAR = /[\u4e00-\u9fff]/g;

  /** 品名前綴（需清理） */
  private readonly ITEM_PREFIX = /^[*＊(（][A-Z)）]*\s*/i;

  /**
   * 通用解析器，對所有文字都嘗試解析
   */
  canParse(_rawText: string, _brandName?: string): boolean {
    return true;
  }

  /**
   * 解析品項明細
   */
  async parse(rawText: string): Promise<ReceiptLineItem[]> {
    const rawLines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    if (rawLines.length < 2) {
      return [];
    }

    // 0. 預處理：合併被 OCR 拆分的價格行
    const lines = this.preprocessLines(rawLines);

    // 1. 行分類
    const classified = lines.map((line) => this.classifyLine(line));

    // 2. 模式偵測
    const format = this.detectFormat(classified);
    this.logger.debug(`偵測到收據格式: ${format}`);

    // 3. 品項提取
    const items = this.extractItems(classified, format);

    this.logger.debug(`解析到 ${items.length} 個品項`);
    return items;
  }

  /**
   * 分類單行文字
   */
  classifyLine(line: string): ClassifiedLine {
    const trimmed = line.trim();

    // 1. 分隔線
    if (this.SEPARATOR_PATTERN.test(trimmed) || trimmed.length === 0) {
      return { text: trimmed, type: LineType.SEPARATOR };
    }

    // 2. 合計行（最先檢查，避免被其他分類攔截）
    if (this.TOTAL_KEYWORDS.test(trimmed)) {
      return { text: trimmed, type: LineType.TOTAL };
    }

    // 3. 折扣行
    if (this.DISCOUNT_PATTERN.test(trimmed)) {
      const discountMatch = trimmed.match(/\$\s*-?\s*(\d+)/);
      const subtotal = discountMatch ? -parseInt(discountMatch[1], 10) : 0;
      return { text: trimmed, type: LineType.DISCOUNT, subtotal };
    }

    if (this.DISCOUNT_KEYWORDS.test(trimmed) && /\d+/.test(trimmed)) {
      const numMatch = trimmed.match(/(\d+)\s*$/);
      const subtotal = numMatch ? -parseInt(numMatch[1], 10) : 0;
      return { text: trimmed, type: LineType.DISCOUNT, subtotal };
    }

    // 4. 價格明細行（$單價×數量 $小計）
    for (const pattern of this.PRICE_DETAIL_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        return {
          text: trimmed,
          type: LineType.PRICE_DETAIL,
          unitPrice: parseInt(match[1], 10),
          quantity: parseInt(match[2], 10),
          subtotal: parseInt(match[3], 10),
        };
      }
    }

    // 4b. 部分價格行（$35x1、$59x 2，無小計，自動計算）
    const partialPriceMatch = trimmed.match(/^\$(\d+)\s*[xX×]\s*(\d+)\s*$/);
    if (partialPriceMatch) {
      const unitPrice = parseInt(partialPriceMatch[1], 10);
      const quantity = parseInt(partialPriceMatch[2], 10);
      return {
        text: trimmed,
        type: LineType.PRICE_DETAIL,
        unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
      };
    }

    // 4c. 孤立金額行（$118 TX、$1000 等，非品項）
    if (/^\$\d+\s*(?:TX|T)?\s*$/i.test(trimmed)) {
      return { text: trimmed, type: LineType.METADATA };
    }

    // 5. 後設資料
    if (this.METADATA_KEYWORDS.test(trimmed)) {
      return { text: trimmed, type: LineType.METADATA };
    }

    // 6. 日期行
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed) ||
        /^\d{2,3}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) {
      return { text: trimmed, type: LineType.METADATA };
    }

    // 7. 品項+金額同行 vs 僅品名
    const trailingPrice = this.extractTrailingPrice(trimmed);
    const chineseChars = trimmed.match(this.CHINESE_CHAR);
    const hasChinese = chineseChars && chineseChars.length >= 2;

    if (trailingPrice !== null && hasChinese) {
      return {
        text: trimmed,
        type: LineType.ITEM_WITH_PRICE,
        subtotal: trailingPrice,
      };
    }

    // 品名行（有中文或英文，長度合理）
    if ((hasChinese || /[a-zA-Z]{2,}/.test(trimmed)) && trimmed.length >= 2 && trimmed.length <= 60) {
      return { text: trimmed, type: LineType.ITEM_NAME_ONLY };
    }

    // 純數字短行或無法辨識 → 後設資料
    return { text: trimmed, type: LineType.METADATA };
  }

  /**
   * 偵測收據使用哪種品項格式
   */
  detectFormat(lines: ClassifiedLine[]): ReceiptFormat {
    let priceDetailCount = 0;
    let itemWithPriceCount = 0;

    for (const line of lines) {
      if (line.type === LineType.PRICE_DETAIL) priceDetailCount++;
      if (line.type === LineType.ITEM_WITH_PRICE) itemWithPriceCount++;
    }

    // 有 PRICE_DETAIL 行 → 以雙行式為主
    if (priceDetailCount > 0 && priceDetailCount >= itemWithPriceCount) {
      return ReceiptFormat.TWO_LINE;
    }

    // 只有 ITEM_WITH_PRICE → 單行式
    if (itemWithPriceCount > 0 && priceDetailCount === 0) {
      return ReceiptFormat.SINGLE_LINE;
    }

    // 兩者都有 → 混合
    if (priceDetailCount > 0 && itemWithPriceCount > 0) {
      return ReceiptFormat.MIXED;
    }

    // 預設嘗試單行式
    return ReceiptFormat.SINGLE_LINE;
  }

  /**
   * 預處理：合併被 OCR 拆分的價格行
   *
   * OCR 有時會把 "$59x 2 $118 TX" 拆成兩行：
   *   第 1 行: "$59x 2"
   *   第 2 行: "$118 TX"
   * 此方法將它們合併回一行。
   */
  private preprocessLines(lines: string[]): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

      // 偵測部分價格行（$59x 2）+ 孤立小計行（$118 TX）
      const isPartialPrice = /^\$\d+\s*[xX×]\s*\d+\s*$/.test(line);
      const isOrphanSubtotal = nextLine !== null && /^\$\d+\s*(?:TX|T)?\s*$/i.test(nextLine);

      if (isPartialPrice && isOrphanSubtotal) {
        result.push(`${line} ${nextLine}`);
        i += 2;
      } else {
        result.push(line);
        i++;
      }
    }

    return result;
  }

  /**
   * 依偵測到的格式提取品項
   */
  private extractItems(
    lines: ClassifiedLine[],
    format: ReceiptFormat,
  ): ReceiptLineItem[] {
    // 定位品項區間：第一個品項/價格行 ~ 第一個 TOTAL 行
    const itemZone = this.findItemZone(lines);
    if (!itemZone || itemZone.length === 0) {
      return [];
    }

    const items: ReceiptLineItem[] = [];

    switch (format) {
      case ReceiptFormat.TWO_LINE:
        this.extractTwoLineItems(itemZone, items);
        break;
      case ReceiptFormat.SINGLE_LINE:
        this.extractSingleLineItems(itemZone, items);
        break;
      case ReceiptFormat.MIXED:
        // 混合模式：同時處理兩種格式
        this.extractMixedItems(itemZone, items);
        break;
    }

    return items;
  }

  /**
   * 找出品項區間
   *
   * 從第一個品項相關行開始，到 TOTAL 行之前結束。
   * 跳過開頭的 METADATA 和 SEPARATOR。
   */
  private findItemZone(lines: ClassifiedLine[]): ClassifiedLine[] | null {
    const itemTypes = new Set([
      LineType.ITEM_NAME_ONLY,
      LineType.ITEM_WITH_PRICE,
      LineType.PRICE_DETAIL,
      LineType.DISCOUNT,
    ]);

    let startIdx = -1;
    let endIdx = lines.length;

    // 找第一個品項相關行
    for (let i = 0; i < lines.length; i++) {
      if (itemTypes.has(lines[i].type)) {
        startIdx = i;
        break;
      }
    }

    if (startIdx === -1) return null;

    // 找第一個 TOTAL 行（在品項開始之後）
    for (let i = startIdx; i < lines.length; i++) {
      if (lines[i].type === LineType.TOTAL) {
        endIdx = i;
        break;
      }
    }

    return lines.slice(startIdx, endIdx);
  }

  /**
   * 雙行式提取：品名行 + 價格明細行
   *
   * Phase 1: 依序配對（品名 → 價格）
   * Phase 2: OCR 順序錯亂時，將「出現在價格行之後」的未配對品名
   *          回填到 Phase 1 中標記為「未知品項」的項目
   */
  private extractTwoLineItems(
    zone: ClassifiedLine[],
    items: ReceiptLineItem[],
  ): void {
    // 7-ELEVEN 等便利商店收據的特殊格式：
    // 品名全部列在前面，價格全部列在後面
    // 例如：
    //   麥香奶茶CAN340       ← ITEM_NAME_ONLY
    //   *左岸咖啡館奶茶       ← ITEM_NAME_ONLY
    //   (A)統 陽光豆漿        ← ITEM_NAME_ONLY
    //   $25x 2  $50 TX      ← PRICE_DETAIL
    //   $35x1   $35 TX      ← PRICE_DETAIL
    //   $25x1   $25 TX      ← PRICE_DETAIL
    //
    // 策略：偵測是否有連續品名群組，如果有則用「先收集再配對」模式

    // 偵測批量模式：zone 開頭是否有 >=2 個連續品名，後面緊跟 >=2 個連續價格
    // 例如：品名A、品名B、品名C、$25x2、$35x1、$25x1
    // 而非：品名A、$25x2、品名B、$35x1（這是交替模式）
    let leadingNames = 0;
    let followingPrices = 0;
    let phase: 'names' | 'prices' | 'done' = 'names';
    for (const line of zone) {
      if (phase === 'names') {
        if (line.type === LineType.ITEM_NAME_ONLY) {
          leadingNames++;
        } else if (line.type === LineType.PRICE_DETAIL) {
          phase = 'prices';
          followingPrices++;
        } else {
          break; // 其他類型中斷
        }
      } else if (phase === 'prices') {
        if (line.type === LineType.PRICE_DETAIL) {
          followingPrices++;
        } else {
          break;
        }
      }
    }

    if (leadingNames >= 2 && followingPrices >= 2) {
      // 批量配對模式：品名和價格分開列出
      this.extractBatchTwoLineItems(zone, items);
    } else {
      // 交替配對模式：品名→價格→品名→價格
      this.extractAlternatingTwoLineItems(zone, items);
    }
  }

  /**
   * 批量配對模式：品名群組 + 價格群組，依序配對
   * 適用於 7-ELEVEN 等便利商店收據
   */
  private extractBatchTwoLineItems(
    zone: ClassifiedLine[],
    items: ReceiptLineItem[],
  ): void {
    // 收集所有品名和價格
    const names: string[] = [];
    const prices: ClassifiedLine[] = [];

    for (const line of zone) {
      if (line.type === LineType.ITEM_NAME_ONLY) {
        names.push(this.cleanItemName(line.text));
      } else if (line.type === LineType.PRICE_DETAIL) {
        prices.push(line);
      } else if (line.type === LineType.DISCOUNT) {
        // 折扣行可能夾帶品名（如「自帶杯獎勵5元(咖啡1)」）
        // 先處理已收集的品名+價格，再處理折扣
        const name = this.extractDiscountName(line.text);
        items.push({
          name,
          quantity: 1,
          subtotal: line.subtotal ?? 0,
          isDiscount: true,
        });
      } else if (line.type === LineType.ITEM_WITH_PRICE) {
        const name = this.extractItemNameFromPriceLine(line.text);
        items.push({
          name: this.cleanItemName(name),
          quantity: 1,
          subtotal: line.subtotal ?? 0,
          isDiscount: (line.subtotal ?? 0) < 0,
        });
      }
    }

    // 依序配對品名和價格
    const pairCount = Math.min(names.length, prices.length);
    // 從 items 陣列的開頭插入配對結果（折扣和 ITEM_WITH_PRICE 已在後面）
    const pairedItems: ReceiptLineItem[] = [];
    for (let i = 0; i < pairCount; i++) {
      pairedItems.push({
        name: names[i],
        unitPrice: prices[i].unitPrice,
        quantity: prices[i].quantity ?? 1,
        subtotal: prices[i].subtotal ?? 0,
        isDiscount: false,
      });
    }

    // 未配對的價格（品名不夠）
    for (let i = pairCount; i < prices.length; i++) {
      pairedItems.push({
        name: '未知品項',
        unitPrice: prices[i].unitPrice,
        quantity: prices[i].quantity ?? 1,
        subtotal: prices[i].subtotal ?? 0,
        isDiscount: false,
      });
    }

    // 插入到 items 開頭（折扣行已在後面）
    items.unshift(...pairedItems);
  }

  /**
   * 交替配對模式：品名→價格→品名→價格
   * 適用於一般收據
   */
  private extractAlternatingTwoLineItems(
    zone: ClassifiedLine[],
    items: ReceiptLineItem[],
  ): void {
    let pendingName: string | null = null;
    let pendingNameIdx = -1;
    const consumedNameIndices = new Set<number>();

    for (let i = 0; i < zone.length; i++) {
      const line = zone[i];

      if (line.type === LineType.ITEM_NAME_ONLY) {
        pendingName = this.cleanItemName(line.text);
        pendingNameIdx = i;
      } else if (line.type === LineType.PRICE_DETAIL) {
        if (pendingName !== null) {
          consumedNameIndices.add(pendingNameIdx);
        }
        items.push({
          name: pendingName ?? '未知品項',
          unitPrice: line.unitPrice,
          quantity: line.quantity ?? 1,
          subtotal: line.subtotal ?? 0,
          isDiscount: false,
        });
        pendingName = null;
      } else if (line.type === LineType.DISCOUNT) {
        const name = this.extractDiscountName(line.text);
        items.push({
          name,
          quantity: 1,
          subtotal: line.subtotal ?? 0,
          isDiscount: true,
        });
        pendingName = null;
      } else if (line.type === LineType.ITEM_WITH_PRICE) {
        const name = this.extractItemNameFromPriceLine(line.text);
        items.push({
          name: this.cleanItemName(name),
          quantity: 1,
          subtotal: line.subtotal ?? 0,
          isDiscount: false,
        });
        pendingName = null;
      }
    }

    // 回填：將「未知品項」替換為 OCR 順序錯亂的未消費品名
    const hasUnknown = items.some((it) => it.name === '未知品項');
    if (hasUnknown) {
      // 排除店名/品牌名（如 7-ELEVEN）— 這些不是品項名稱
      const storeBrandPatterns = /^7-ELEVEN|^7-ELEVEn|^FamilyMart|^全家|^萊爾富|^OK超商/i;
      const lateNames: string[] = [];
      for (let i = 0; i < zone.length; i++) {
        if (zone[i].type === LineType.ITEM_NAME_ONLY && !consumedNameIndices.has(i)) {
          const cleaned = this.cleanItemName(zone[i].text);
          if (!storeBrandPatterns.test(cleaned) && !storeBrandPatterns.test(zone[i].text)) {
            lateNames.push(cleaned);
          }
        }
      }
      let nameIdx = 0;
      for (const item of items) {
        if (item.name === '未知品項' && nameIdx < lateNames.length) {
          item.name = lateNames[nameIdx++];
        }
      }
    }
  }

  /**
   * 單行式提取：品名和金額在同一行
   */
  private extractSingleLineItems(
    zone: ClassifiedLine[],
    items: ReceiptLineItem[],
  ): void {
    for (const line of zone) {
      if (line.type === LineType.ITEM_WITH_PRICE) {
        const name = this.extractItemNameFromPriceLine(line.text);
        items.push({
          name: this.cleanItemName(name),
          quantity: 1,
          subtotal: line.subtotal ?? 0,
          isDiscount: false,
        });
      } else if (line.type === LineType.DISCOUNT) {
        const name = this.extractDiscountName(line.text);
        items.push({
          name,
          quantity: 1,
          subtotal: line.subtotal ?? 0,
          isDiscount: true,
        });
      }
    }
  }

  /**
   * 混合式提取：同時處理雙行和單行格式
   *
   * 改良後的 extractTwoLineItems 已能處理 ITEM_WITH_PRICE，
   * 因此混合模式直接委派給它。
   */
  private extractMixedItems(
    zone: ClassifiedLine[],
    items: ReceiptLineItem[],
  ): void {
    this.extractTwoLineItems(zone, items);
  }

  /**
   * 從行尾提取金額
   *
   * 策略：
   * - $前綴的數字優先
   * - 行尾最後一個以空白分隔的獨立數字
   * - 忽略嵌入品名中的數字（如 240ml, can35）
   *
   * @returns 金額數字，或 null 表示此行不含金額
   */
  extractTrailingPrice(line: string): number | null {
    // 先排除整行是 PRICE_DETAIL 格式的情況（那個由 classifyLine 處理）
    for (const pattern of this.PRICE_DETAIL_PATTERNS) {
      if (pattern.test(line)) return null;
    }

    // 策略 1: 行尾有 $N 格式
    const dollarTrailing = line.match(/\$\s*(\d{1,6})\s*(?:TX|T)?\s*$/);
    if (dollarTrailing) {
      return parseInt(dollarTrailing[1], 10);
    }

    // 策略 2: 行尾有空白分隔的獨立數字（至少 2 個空格或 tab 分隔）
    const spaceSeparated = line.match(/\s{2,}(\d{1,6})\s*(?:TX|T)?\s*$/);
    if (spaceSeparated) {
      const num = parseInt(spaceSeparated[1], 10);
      // 排除不合理的金額（太小可能是編號或數量）
      if (num >= 1 && num <= 999999) {
        return num;
      }
    }

    return null;
  }

  /**
   * 清理品名前綴
   *
   * 移除 *, (A), (T) 等收據常見前綴標記
   */
  cleanItemName(name: string): string {
    return name
      .replace(this.ITEM_PREFIX, '') // 移除 *, (A) 等前綴
      .replace(/\s+/g, ' ')         // 合併多餘空格
      .trim();
  }

  /**
   * 從帶金額的行中提取品名部分
   *
   * 將行尾的金額部分去除，保留品名
   */
  private extractItemNameFromPriceLine(line: string): string {
    // 去除行尾的 $金額 或 空白+金額
    let name = line
      .replace(/\s*\$\s*\d{1,6}\s*(?:TX|T)?\s*$/, '')
      .replace(/\s{2,}\d{1,6}\s*(?:TX|T)?\s*$/, '')
      .trim();

    // 如果清理後為空，使用原始行
    if (!name) {
      name = line.trim();
    }

    return name;
  }

  /**
   * 從折扣行提取折扣名稱
   */
  private extractDiscountName(line: string): string {
    const name = line
      .replace(/\s*\$\s*-?\s*\d+\s*$/, '')
      .trim();
    return name || '折扣';
  }
}
