import { Injectable, Logger } from '@nestjs/common';

/**
 * 文字解析服務
 *
 * 從 OCR 辨識的原始文字中提取：
 * - 公司名稱
 * - 統一編號
 * - 金額
 * - 日期
 * - 電子發票號碼
 *
 * 支援台灣電子發票格式
 */
@Injectable()
export class TextParserService {
  private readonly logger = new Logger(TextParserService.name);

  /**
   * OCR 常見混淆字元對照
   * 用於標準化 OCR 辨識文字
   */
  private readonly ocrConfusions: Array<[string, string[]]> = [
    ['0', ['O', 'o', '〇', 'Ｏ']],
    ['1', ['l', 'I', '|', 'i', '１']],
    ['5', ['S', 's', '５']],
    ['8', ['B', '８']],
    ['台', ['臺', '台']],
    ['鋪', ['舖', '铺']],
  ];

  /**
   * 受保護的品牌名稱（不應被排除規則排除）
   */
  private readonly protectedBrandPatterns: RegExp[] = [
    /^7-ELEVEN$/i, /^7-11$/i, /^Hi-Life$/i, /^RT-MART$/i,
    /^OK$/i, /^COSTCO$/i, /^IKEA$/i, /^UNIQLO$/i, /^MUJI$/i,
    /^SOGO$/i, /^CoCo$/i, /^MOS$/i, /^KFC$/i,
  ];

  /**
   * 台灣知名連鎖店品牌對照（100+ 品牌）
   * 用於從 OCR 文字中識別店名
   */
  private readonly franchisePatterns: Array<{ pattern: RegExp; brandName: string }> = [
    // ========== 便利商店 ==========
    { pattern: /7-ELEVEN|7-11|統一超商|7．11|7．ELEVEN/i, brandName: '7-ELEVEN' },
    // OCR 容錯：收據字體常在字母間插入 "1" 等噪音數字（如 171-1E1L1E1V1E1n）
    { pattern: /\d*7\d*[-–—.\s]\d*E\d*L\d*E\d*V\d*E\d*N/i, brandName: '7-ELEVEN' },
    { pattern: /全家便利|FamilyMart|全家超商|全\s*家/i, brandName: '全家便利商店' },
    { pattern: /萊爾富|Hi-Life|HiLife/i, brandName: '萊爾富' },
    { pattern: /OK超商|OK便利|OK\s*mart|來來超商/i, brandName: 'OK超商' },

    // ========== 餐飲 - 速食 ==========
    { pattern: /麥當勞|McDonald|麥當労/i, brandName: '麥當勞' },
    { pattern: /肯德基|KFC|Kentucky/i, brandName: '肯德基' },
    { pattern: /摩斯漢堡|MOS\s*BURGER|摩斯/i, brandName: '摩斯漢堡' },
    { pattern: /漢堡王|BURGER\s*KING/i, brandName: '漢堡王' },
    { pattern: /SUBWAY|潛艇堡|賽百味/i, brandName: 'SUBWAY' },
    { pattern: /達美樂|Domino/i, brandName: '達美樂' },
    { pattern: /必勝客|Pizza\s*Hut/i, brandName: '必勝客' },
    { pattern: /頂呱呱|TKK/i, brandName: '頂呱呱' },
    { pattern: /丹丹漢堡/i, brandName: '丹丹漢堡' },

    // ========== 餐飲 - 咖啡 ==========
    { pattern: /星巴克|Starbucks|STARBUCKS/i, brandName: '星巴克' },
    { pattern: /路易莎|LOUISA|Louisa/i, brandName: '路易莎咖啡' },
    { pattern: /85度C|85°C|85度Ｃ/i, brandName: '85度C' },
    { pattern: /CAMA|cama\s*café|cama咖啡/i, brandName: 'cama café' },
    { pattern: /伯朗咖啡|Mr\.?\s*Brown/i, brandName: '伯朗咖啡' },
    { pattern: /丹堤咖啡|DANTE/i, brandName: '丹堤咖啡' },
    { pattern: /怡客咖啡|Ikari/i, brandName: '怡客咖啡' },
    { pattern: /西雅圖咖啡|SEATTLE/i, brandName: '西雅圖咖啡' },

    // ========== 餐飲 - 飲料 ==========
    { pattern: /五十嵐|50嵐|50藍/i, brandName: '五十嵐' },
    { pattern: /清心福全/i, brandName: '清心福全' },
    { pattern: /迷客夏|MILK\s*SHOP|Milkshop/i, brandName: '迷客夏' },
    { pattern: /CoCo都可|CoCo|都可/i, brandName: 'CoCo都可' },
    { pattern: /大苑子/i, brandName: '大苑子' },
    { pattern: /鮮茶道/i, brandName: '鮮茶道' },
    { pattern: /茶湯會/i, brandName: '茶湯會' },
    { pattern: /可不可|KEBUKE/i, brandName: '可不可熟成紅茶' },
    { pattern: /一芳|YIFANG/i, brandName: '一芳水果茶' },
    { pattern: /天仁茗茶|天仁/i, brandName: '天仁茗茶' },
    { pattern: /春水堂/i, brandName: '春水堂' },
    { pattern: /珍煮丹/i, brandName: '珍煮丹' },
    { pattern: /老虎堂/i, brandName: '老虎堂' },
    { pattern: /日出茶太/i, brandName: '日出茶太' },
    { pattern: /龜記|龜記茗品/i, brandName: '龜記茗品' },

    // ========== 餐飲 - 連鎖餐廳 ==========
    { pattern: /鼎泰豐/i, brandName: '鼎泰豐' },
    { pattern: /王品|王品集團/i, brandName: '王品' },
    { pattern: /瓦城|瓦城泰國料理/i, brandName: '瓦城' },
    { pattern: /八方雲集/i, brandName: '八方雲集' },
    { pattern: /爭鮮|SUSHI\s*EXPRESS/i, brandName: '爭鮮' },
    { pattern: /藏壽司|くら寿司|KURA/i, brandName: '藏壽司' },
    { pattern: /壽司郎|スシロー|SUSHIRO/i, brandName: '壽司郎' },
    { pattern: /吉野家|YOSHINOYA/i, brandName: '吉野家' },
    { pattern: /すき家|SUKIYA|好家/i, brandName: 'すき家' },
    { pattern: /定食8|定食８/i, brandName: '定食8' },
    { pattern: /三商巧福/i, brandName: '三商巧福' },
    { pattern: /鬍鬚張/i, brandName: '鬍鬚張' },
    { pattern: /四海遊龍/i, brandName: '四海遊龍' },
    { pattern: /石二鍋/i, brandName: '石二鍋' },
    { pattern: /涮乃葉/i, brandName: '涮乃葉' },
    { pattern: /海底撈/i, brandName: '海底撈' },
    { pattern: /築間|築間幸福鍋物/i, brandName: '築間' },
    { pattern: /這一鍋/i, brandName: '這一鍋' },
    { pattern: /千葉火鍋/i, brandName: '千葉火鍋' },
    { pattern: /饗食天堂/i, brandName: '饗食天堂' },
    { pattern: /欣葉/i, brandName: '欣葉' },
    { pattern: /添好運/i, brandName: '添好運' },
    { pattern: /鼎王/i, brandName: '鼎王' },
    { pattern: /陶板屋/i, brandName: '陶板屋' },
    { pattern: /西堤|TASTY/i, brandName: '西堤' },
    { pattern: /原燒/i, brandName: '原燒' },
    { pattern: /聚|聚北海道/i, brandName: '聚' },
    { pattern: /品田牧場/i, brandName: '品田牧場' },
    { pattern: /勝博殿|SABOTEN/i, brandName: '勝博殿' },
    { pattern: /一蘭|ICHIRAN/i, brandName: '一蘭拉麵' },
    { pattern: /屯京拉麵/i, brandName: '屯京拉麵' },
    { pattern: /花月嵐/i, brandName: '花月嵐' },

    // ========== 超市/量販 ==========
    { pattern: /全聯福利|全聯|PX\s*MART|PXMART/i, brandName: '全聯福利中心' },
    { pattern: /家樂福|Carrefour/i, brandName: '家樂福' },
    { pattern: /大潤發|RT-MART|RT\s*MART/i, brandName: '大潤發' },
    { pattern: /好市多|COSTCO|Costco/i, brandName: '好市多' },
    { pattern: /愛買|a\.mart|A\.MART/i, brandName: '愛買' },
    { pattern: /頂好|WELLCOME|Wellcome/i, brandName: '頂好' },
    { pattern: /美聯社/i, brandName: '美聯社' },
    { pattern: /Jasons|JASONS/i, brandName: 'Jasons' },
    { pattern: /city\'?super/i, brandName: 'city\'super' },

    // ========== 藥妝 ==========
    { pattern: /屈臣氏|Watsons|WATSONS/i, brandName: '屈臣氏' },
    { pattern: /康是美|Cosmed|COSMED/i, brandName: '康是美' },
    { pattern: /寶雅|POYA|Poya/i, brandName: '寶雅' },
    { pattern: /小三美日/i, brandName: '小三美日' },
    { pattern: /日藥本舖/i, brandName: '日藥本舖' },
    { pattern: /松本清|MATSUMOTO/i, brandName: '松本清' },
    { pattern: /大樹藥局/i, brandName: '大樹藥局' },
    { pattern: /杏一|杏一醫療/i, brandName: '杏一' },

    // ========== 百貨/購物 ==========
    { pattern: /SOGO|太平洋崇光|崇光/i, brandName: 'SOGO百貨' },
    { pattern: /新光三越/i, brandName: '新光三越' },
    { pattern: /遠東百貨|遠百|FE21/i, brandName: '遠東百貨' },
    { pattern: /微風|Breeze|BREEZE/i, brandName: '微風廣場' },
    { pattern: /統一時代|統一時代百貨/i, brandName: '統一時代百貨' },
    { pattern: /漢神百貨|漢神/i, brandName: '漢神百貨' },
    { pattern: /大立百貨|大立/i, brandName: '大立百貨' },
    { pattern: /中友百貨|中友/i, brandName: '中友百貨' },
    { pattern: /UNIQLO|優衣庫/i, brandName: 'UNIQLO' },
    { pattern: /無印良品|MUJI/i, brandName: '無印良品' },
    { pattern: /IKEA|宜家|宜家家居/i, brandName: 'IKEA' },
    { pattern: /DAISO|大創|大創百貨/i, brandName: '大創' },
    { pattern: /NET|NET服飾/i, brandName: 'NET' },
    { pattern: /ZARA/i, brandName: 'ZARA' },
    { pattern: /H&M/i, brandName: 'H&M' },
    { pattern: /GU/i, brandName: 'GU' },
    { pattern: /誠品|ESLITE/i, brandName: '誠品' },
    { pattern: /金石堂/i, brandName: '金石堂' },
    { pattern: /墊腳石/i, brandName: '墊腳石' },

    // ========== 交通 ==========
    { pattern: /台灣高鐵|高鐵|THSR/i, brandName: '台灣高鐵' },
    { pattern: /台鐵|臺鐵|TRA/i, brandName: '台鐵' },
    { pattern: /中油|台灣中油|CPC/i, brandName: '台灣中油' },
    { pattern: /台塑石油|台亞|FORMOSA/i, brandName: '台塑石油' },
    { pattern: /全國加油站/i, brandName: '全國加油站' },
    { pattern: /山隆|山隆通運/i, brandName: '山隆' },
    { pattern: /台灣大車隊|55688/i, brandName: '台灣大車隊' },
    { pattern: /Uber|UBER/i, brandName: 'Uber' },

    // ========== 電信 ==========
    { pattern: /中華電信|CHT/i, brandName: '中華電信' },
    { pattern: /台灣大哥大|台哥大|TWM/i, brandName: '台灣大哥大' },
    { pattern: /遠傳電信|遠傳|FET/i, brandName: '遠傳電信' },
    { pattern: /台灣之星/i, brandName: '台灣之星' },
    { pattern: /亞太電信/i, brandName: '亞太電信' },

    // ========== 住宿 ==========
    { pattern: /晶華|REGENT|Regent/i, brandName: '晶華酒店' },
    { pattern: /老爺酒店|老爺/i, brandName: '老爺酒店' },
    { pattern: /福華大飯店|福華/i, brandName: '福華大飯店' },
    { pattern: /圓山大飯店|圓山/i, brandName: '圓山大飯店' },
    { pattern: /國賓大飯店|國賓/i, brandName: '國賓大飯店' },
    { pattern: /六福|六福客棧|六福萬怡/i, brandName: '六福' },
    { pattern: /寒舍|寒舍艾美|寒舍艾麗/i, brandName: '寒舍' },
    { pattern: /捷絲旅|Just\s*Sleep/i, brandName: '捷絲旅' },
    { pattern: /和逸|HOTEL\s*COZZI/i, brandName: '和逸飯店' },

    // ========== 電影院 ==========
    { pattern: /威秀|VIESHOW/i, brandName: '威秀影城' },
    { pattern: /國賓影城/i, brandName: '國賓影城' },
    { pattern: /秀泰影城|SHOWTIME/i, brandName: '秀泰影城' },
    { pattern: /喜滿客/i, brandName: '喜滿客' },
    { pattern: /美麗華影城|美麗華/i, brandName: '美麗華影城' },
    { pattern: /新光影城/i, brandName: '新光影城' },

    // ========== 娛樂/景點 ==========
    { pattern: /六福村/i, brandName: '六福村' },
    { pattern: /劍湖山/i, brandName: '劍湖山' },
    { pattern: /九族文化村|九族/i, brandName: '九族文化村' },
    { pattern: /麗寶樂園|麗寶/i, brandName: '麗寶樂園' },
    { pattern: /義大遊樂世界|義大/i, brandName: '義大世界' },

    // ========== 日本 — 便利商店 ==========
    { pattern: /ローソン|LAWSON/i, brandName: 'Lawson' },
    { pattern: /セブン[-ー]?イレブン|セブンイレブン/i, brandName: '7-Eleven' },
    { pattern: /ファミリーマート|ファミマ/i, brandName: 'FamilyMart' },
    { pattern: /ミニストップ|MINISTOP/i, brandName: 'MINISTOP' },

    // ========== 日本 — 藥妝 ==========
    { pattern: /マツモトキヨシ|マツキヨ|MATSUMOTO\s*KIYOSHI/i, brandName: 'マツモトキヨシ' },
    { pattern: /ココカラファイン|cocokara/i, brandName: 'ココカラファイン' },
    { pattern: /ドン・キホーテ|ドンキ|DON\s*QUIJOTE/i, brandName: 'ドン・キホーテ' },
    { pattern: /サンドラッグ|SUNDRUG/i, brandName: 'サンドラッグ' },
    { pattern: /ツルハ|TSURUHA/i, brandName: 'ツルハドラッグ' },
    { pattern: /ダイコク|DAIKOKU/i, brandName: 'ダイコクドラッグ' },

    // ========== 日本 — 餐飲 ==========
    { pattern: /EXCELSIOR\s*CAFF[ÉE]/i, brandName: 'EXCELSIOR CAFFÉ' },
    { pattern: /蔦屋書店|TSUTAYA/i, brandName: '蔦屋書店' },
    { pattern: /スターバックス|STARBUCKS/i, brandName: 'Starbucks' },
    { pattern: /ドトール|DOUTOR/i, brandName: 'ドトールコーヒー' },
    { pattern: /タリーズ|TULLY'?S/i, brandName: "Tully's Coffee" },
    { pattern: /吉野家|YOSHINOYA/i, brandName: '吉野家' },
    { pattern: /すき家|SUKIYA/i, brandName: 'すき家' },
    { pattern: /松屋|MATSUYA/i, brandName: '松屋' },
    { pattern: /一蘭|ICHIRAN/i, brandName: '一蘭' },

    // ========== 日本 — 百貨/購物 ==========
    { pattern: /ビックカメラ|BIC\s*CAMERA/i, brandName: 'ビックカメラ' },
    { pattern: /ヨドバシ|YODOBASHI/i, brandName: 'ヨドバシカメラ' },
    { pattern: /ユニクロ|UNIQLO/i, brandName: 'UNIQLO' },
    { pattern: /ダイソー|DAISO/i, brandName: 'ダイソー' },
    { pattern: /無印良品|MUJI/i, brandName: '無印良品' },

    // ========== 韓國 — 便利商店 ==========
    { pattern: /CU편의점|^CU\b/i, brandName: 'CU' },
    { pattern: /GS25/i, brandName: 'GS25' },
    { pattern: /세븐일레븐/i, brandName: '7-Eleven' },
    { pattern: /이마트24|emart24/i, brandName: 'emart24' },

    // ========== 韓國 — 美妝/藥妝 ==========
    { pattern: /올리브영|OLIVE\s*YOUNG/i, brandName: 'OLIVE YOUNG' },
    { pattern: /바비렛/i, brandName: '바비렛' },

    // ========== 韓國 — 購物/免稅 ==========
    { pattern: /LOTTE\s*DUTY\s*FREE|롯데면세/i, brandName: 'LOTTE DUTY FREE' },
    { pattern: /신라면세|SHILLA\s*DUTY/i, brandName: '新羅免稅店' },
    { pattern: /LOTTE\s*MART|롯데마트/i, brandName: 'LOTTE MART' },
    { pattern: /이마트|E-?MART/i, brandName: 'E-MART' },
    { pattern: /다이소|DAISO/i, brandName: 'DAISO' },

    // ========== 韓國 — 餐飲 ==========
    { pattern: /스타벅스|STARBUCKS/i, brandName: 'Starbucks' },
    { pattern: /배스킨라빈스|BASKIN/i, brandName: 'Baskin Robbins' },
    { pattern: /맥도날드|MCDONALD/i, brandName: "McDonald's" },
  ];

  /**
   * 標準化 OCR 文字（處理常見誤讀）
   */
  private normalizeOcrText(text: string): string {
    let normalized = text;
    for (const [standard, confusions] of this.ocrConfusions) {
      for (const confused of confusions) {
        const escapedConfused = confused.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        normalized = normalized.replace(new RegExp(escapedConfused, 'g'), standard);
      }
    }
    return normalized;
  }

  /**
   * 從原始文字中提取公司名稱
   *
   * 優先順序：
   * 1. 先嘗試識別知名連鎖店品牌（使用標準化文字）
   * 2. 再找包含公司後綴的行
   * 3. 最後嘗試從排除規則中找出第一個有效行
   */
  extractCompanyName(text: string): string | undefined {
    // 標準化 OCR 文字（處理常見誤讀）
    const normalizedText = this.normalizeOcrText(text);
    const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);

    // 1. 先嘗試識別知名連鎖店品牌（優先，因為更準確）
    const franchiseName = this.extractFranchiseName(normalizedText);
    if (franchiseName) {
      return franchiseName;
    }

    // 2. 嘗試找到包含公司後綴的行
    const companyPatterns = [
      /(.+股份有限公司)/,
      /(.+有限公司)/,
      /(.+企業社)/,
      /(.+商行)/,
      /(.+商店)/,
      /(.+工作室)/,
      /(.+餐廳)/,
      /(.+小吃)/,
    ];

    for (const line of lines) {
      for (const pattern of companyPatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
    }

    // 3. 過濾掉不太可能是店名的行
    const excludePatterns = [
      /^\d+$/, // 純數字
      /^[A-Z]{2}[-\s]?\d{8}$/i, // 發票號碼格式（如 AB-12345678）
      /電子發票/, // 發票標題
      /統一編號|統編/,
      /隨機碼/,
      /賣方|買方/,
      /\d{4}[-/]\d{1,2}[-/]\d{1,2}/, // 日期格式
      /\d{2,3}[-/]\d{1,2}[-/]\d{1,2}/, // 民國年日期格式
      /^NT\$|^\$\d/, // 金額開頭
      /^地址[:：]?/,
      /^電話[:：]?/,
      /^TEL[:：]?/i,
    ];

    for (const line of lines) {
      // 跳過太短或太長的行
      if (line.length < 2 || line.length > 40) continue;

      // 檢查是否為受保護的品牌名稱（不應被排除）
      const isProtectedBrand = this.protectedBrandPatterns.some(p => p.test(line));
      if (isProtectedBrand) {
        this.logger.debug(`識別到受保護品牌: ${line}`);
        return line;
      }

      // 跳過符合排除規則的行
      let shouldExclude = false;
      for (const excludePattern of excludePatterns) {
        if (excludePattern.test(line)) {
          shouldExclude = true;
          break;
        }
      }

      // 額外檢查：純英數但不是受保護品牌
      if (!shouldExclude && /^[A-Z0-9\-\s]+$/i.test(line) && line.length <= 15) {
        // 可能是商品編號或其他代碼，但如果有空格可能是店名
        if (!/\s/.test(line)) {
          shouldExclude = true;
        }
      }

      if (!shouldExclude) {
        return line;
      }
    }

    return undefined;
  }

  /**
   * 從文字中識別知名連鎖店品牌
   * 會同時檢查原始文字和標準化後的文字
   */
  extractFranchiseName(text: string): string | undefined {
    // 先用原始文字匹配
    for (const { pattern, brandName } of this.franchisePatterns) {
      if (pattern.test(text)) {
        this.logger.debug(`識別到連鎖店品牌: ${brandName}`);
        return brandName;
      }
    }

    // 再用標準化文字匹配（處理 OCR 誤讀）
    const normalizedText = this.normalizeOcrText(text);
    if (normalizedText !== text) {
      for (const { pattern, brandName } of this.franchisePatterns) {
        if (pattern.test(normalizedText)) {
          this.logger.debug(`識別到連鎖店品牌（標準化後）: ${brandName}`);
          return brandName;
        }
      }
    }

    return undefined;
  }

  /**
   * 從原始文字中提取統一編號
   *
   * 台灣統一編號為 8 位數字
   */
  extractTaxId(text: string): string | undefined {
    // 常見格式：統編:12345678, 統一編號：12345678
    const patterns = [
      /統[一]?編[號]?[:：]?\s*(\d{8})/,
      /(?:統編|編號)[:：]?\s*(\d{8})/,
      /(\d{8})\s*(?:統編|編號)/,
      // 獨立的 8 位數字（排除日期和金額）
      /(?<![\/\-\d])(\d{8})(?![\/\-\d])/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const taxId = match[1];
        // 驗證：不能全是相同數字
        if (!/^(\d)\1{7}$/.test(taxId)) {
          return taxId;
        }
      }
    }

    return undefined;
  }

  /**
   * 金額關鍵字優先級（中文 — 預設）
   * 數值越高越優先，負數表示排除
   */
  private readonly AMOUNT_KEYWORD_PRIORITY: Record<string, number> = {
    // 最終應付金額（最高優先）
    '應付': 10, '應付金額': 10, '實付': 9, '實付金額': 9, '付款': 8, '付款金額': 8,
    '找零': -1, '找': -1,  // 找零金額要排除
    // 總計類
    '總計': 7, '總額': 7, '總金額': 7, '金額': 6,
    '合計': 6, '合計金額': 6,
    '小計': 5,
    // 排除類（不應作為最終金額）
    '原價': -1, '定價': -1, '單價': -1,
    '折扣': -1, '折抵': -1, '優惠': -1, '減免': -1,
    '稅額': -1, '稅金': -1,
    '現金': -1, '信用卡': -1, '刷卡': -1,  // 支付方式
    '數量': -1, '件': -1, '個': -1,  // 數量
    '人數': -1, '桌號': -1, '房號': -1,  // 其他數字
  };

  /**
   * 多語言金額關鍵字配置
   * 用於根據偵測到的語言擴展金額提取能力
   */
  private readonly MULTILANG_AMOUNT_KEYWORDS: Record<string, Record<string, number>> = {
    ja: {
      // 日文合計/小計（合計 已在中文配置中，此處補充日文專用）
      '合計': 7, '小計': 5, '税込': 6, '税込合計': 8,
      '合 計': 7,  // 空格分隔版本（蔦屋書店收據）
      // 排除
      'お釣り': -1, 'お釣': -1,  // 找零
      '割引': -1,  // 折扣
      '部門割引': -1,  // 部門折扣
      'クーポン割引': -1,  // 優惠券折扣
      '消費税': -1,  // 消費稅
      '内税': -1, '外税': -1,  // 內含稅 / 外加稅
    },
    ko: {
      // 韓文
      '합계금액': 10, '합계': 8,  // 合計金額
      '총금액': 9, '총액': 8,  // 總金額
      '소계': 5,  // 小計
      // 排除
      '받은금액': -1,  // 收款金額
      '거스름돈': -1,  // 找零
      '현금': -1, '현 금': -1,  // 現金
      '부가세': -1,  // 附加稅
      '할인': -1,  // 折扣
      '즉시할인': -1,  // 即時折扣
    },
    en: {
      // 英文
      'Grand Total': 10, 'Total Due': 10,
      'Total': 8, 'TOTAL': 8,
      'Subtotal': 5, 'Sub Total': 5,
      // 排除
      'Change': -1, 'Tax': -1, 'Discount': -1,
      'Cash': -1, 'Card': -1, 'Tip': -1,
    },
    th: {
      // 泰文
      'รวมทั้งสิ้น': 10,  // 總計
      'รวม': 7,  // 合計
      'ยอดรวม': 8,  // 總額
      // 排除
      'ทอน': -1,  // 找零
      'ภาษี': -1,  // 稅
      'ส่วนลด': -1,  // 折扣
    },
  };

  /**
   * 多語言貨幣符號模式
   */
  private readonly MULTILANG_CURRENCY_PATTERNS: Record<string, RegExp[]> = {
    ja: [
      /¥\s*(\d{1,6}(?:[,，]\d{3})*(?:\.\d{1,2})?)\s*(?:非|$|\s)/g,
      /(\d{1,6}(?:[,，]\d{3})*)\s*円/g,
    ],
    ko: [
      /₩\s*(\d{1,6}(?:[,，]\d{3})*)/g,
      /(\d{1,6}(?:[,，]\d{3})*)\s*원/g,
    ],
    en: [
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
      /USD\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
    ],
    th: [
      /฿\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*บาท/g,
    ],
  };


  /**
   * 從原始文字中提取金額
   *
   * 改進的提取策略：
   * 1. 收集所有金額候選項及其關鍵字
   * 2. 排除負面關鍵字（找零、原價、折扣等）
   * 3. 依優先級排序，返回最高優先級的金額
   * 4. 若無關鍵字匹配，回退到貨幣符號或最大金額
   *
   * 支援格式：
   * - NT$100, $100, 100元
   * - 總計 100, 合計：100, 應付 100
   */
  extractAmount(text: string, language?: string): number | undefined {
    // 先遮蔽可能被誤判為金額的數字
    const maskedText = this.maskNonAmountNumbers(text);
    const candidates: Array<{
      amount: number;
      keyword: string | null;
      priority: number;
      source: 'keyword' | 'currency' | 'general';
    }> = [];

    // 1. 提取帶關鍵字的金額（優先級最高）— 包含多語言關鍵字
    this.extractKeywordAmounts(maskedText, candidates, language);

    // 2. 提取帶貨幣符號的金額
    this.extractCurrencyAmounts(maskedText, candidates);

    // 3. 提取一般數字金額
    this.extractGeneralAmounts(maskedText, candidates);

    // 過濾掉負面關鍵字的金額
    const validCandidates = candidates.filter(c => c.priority >= 0);

    if (validCandidates.length === 0) {
      this.logger.debug('未找到有效金額');
      return undefined;
    }

    // 按優先級排序（優先級高 > 金額大）
    validCandidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // 同優先級時，選擇較大的金額（通常是總計）
      return b.amount - a.amount;
    });

    const best = validCandidates[0];
    this.logger.debug(`提取金額: ${best.amount} (來源: ${best.source}, 關鍵字: ${best.keyword}, 優先級: ${best.priority})`);
    return best.amount;
  }

  /**
   * 提取帶關鍵字的金額
   */
  private extractKeywordAmounts(
    text: string,
    candidates: Array<{ amount: number; keyword: string | null; priority: number; source: 'keyword' | 'currency' | 'general' }>,
    language?: string,
  ): void {
    // 合併中文關鍵字 + 偵測語言的關鍵字
    const mergedPriority = { ...this.AMOUNT_KEYWORD_PRIORITY };
    if (language && this.MULTILANG_AMOUNT_KEYWORDS[language]) {
      Object.assign(mergedPriority, this.MULTILANG_AMOUNT_KEYWORDS[language]);
    }

    // 建立關鍵字正則（按長度排序，避免短關鍵字先匹配）
    const keywords = Object.keys(mergedPriority)
      .sort((a, b) => b.length - a.length);

    for (const keyword of keywords) {
      // 匹配 "關鍵字[:：]? [(xxx)]? [N点]? [¥₩$NT$]? 金額" 格式
      // 允許關鍵字後有括號內容（如「合 計(税込)」）和數量詞（如「1点」）
      const pattern = new RegExp(
        `${this.escapeRegex(keyword)}[:：]?\\s*(?:\\([^)]*\\))?\\s*(?:\\d{1,3}[点件個个品]\\s*)?(?:NT\\$?|\\$|¥|₩|฿)?\\s*(\\d{1,6}(?:[,，]\\d{3})*(?:\\.\\d{1,2})?)`,
        'gi'
      );

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amountStr = match[1].replace(/[,，]/g, '');
        const amount = Math.round(parseFloat(amountStr));
        const priority = mergedPriority[keyword] ?? 0;

        if (this.isValidAmount(amount, 'keyword')) {
          candidates.push({
            amount,
            keyword,
            priority,
            source: 'keyword',
          });
        }
      }
    }
  }

  /**
   * 提取帶貨幣符號的金額
   */
  private extractCurrencyAmounts(
    text: string,
    candidates: Array<{ amount: number; keyword: string | null; priority: number; source: 'keyword' | 'currency' | 'general' }>,
  ): void {
    const currencyPatterns: RegExp[] = [
      // 中文/台灣
      /(?:NT\$|NTD)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi,
      /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*元/g,
      // 日文：¥ 符號 + 円 後綴（排除「非」後綴 = 非課稅標記）
      /¥\s*(\d{1,6}(?:[,，]\d{3})*(?:\.\d{1,2})?)\s*(?:非|$|\s|\n)/g,
      /(\d{1,6}(?:[,，]\d{3})*)\s*円/g,
      // 韓文：₩ 符號 + 원 後綴
      /₩\s*(\d{1,6}(?:[,，]\d{3})*)/g,
      /(\d{1,6}(?:[,，]\d{3})*)\s*원/g,
      // 泰文：฿ 符號 + บาท 後綴
      /฿\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*บาท/g,
    ];

    for (const pattern of currencyPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const amountStr = match[1].replace(/[,，]/g, '');
        const amount = Math.round(parseFloat(amountStr));

        // 貨幣符號金額優先級為 3（低於關鍵字）
        if (this.isValidAmount(amount, 'currency')) {
          // 檢查是否已有相同金額的更高優先級候選
          const existing = candidates.find(c => c.amount === amount && c.priority > 3);
          if (!existing) {
            candidates.push({
              amount,
              keyword: null,
              priority: 3,
              source: 'currency',
            });
          }
        }
      }
    }
  }

  /**
   * 提取一般數字金額（無關鍵字或貨幣符號）
   */
  private extractGeneralAmounts(
    text: string,
    candidates: Array<{ amount: number; keyword: string | null; priority: number; source: 'keyword' | 'currency' | 'general' }>,
  ): void {
    // 匹配獨立的數字（前後不是數字）
    const generalPattern = /(?<!\d)(\d{1,6})(?!\d)/g;
    let match;

    while ((match = generalPattern.exec(text)) !== null) {
      const amount = parseInt(match[1], 10);

      // 一般數字金額優先級為 1（最低）
      if (this.isValidAmount(amount, 'general')) {
        // 檢查是否已有相同金額的更高優先級候選
        const existing = candidates.find(c => c.amount === amount && c.priority > 1);
        if (!existing) {
          candidates.push({
            amount,
            keyword: null,
            priority: 1,
            source: 'general',
          });
        }
      }
    }
  }

  /**
   * 驗證金額是否在合理範圍內
   */
  private isValidAmount(amount: number, source: 'keyword' | 'currency' | 'general'): boolean {
    if (isNaN(amount) || amount <= 0) return false;

    switch (source) {
      case 'keyword':
        // 有關鍵字時，範圍可以更寬（1 ~ 10,000,000）
        return amount >= 1 && amount <= 10000000;
      case 'currency':
        // 有貨幣符號時，允許小額（1 ~ 1,000,000）
        return amount >= 1 && amount <= 1000000;
      case 'general':
        // 無標記時，範圍較嚴格（10 ~ 100,000）避免誤判
        return amount >= 10 && amount <= 100000;
      default:
        return false;
    }
  }

  /**
   * 轉義正則表達式特殊字元
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 遮蔽不應被視為金額的數字
   *
   * 包括：
   * - 統一編號（8位數字）
   * - 電子發票號碼（2英文+8數字）
   * - 隨機碼（4位數字）
   * - 長數字序列（序號、條碼等）
   * - 日期時間格式
   * - 單字母 + 數字的編碼（如 B 1542, i 90045788）
   */
  private maskNonAmountNumbers(text: string): string {
    let masked = text;

    // 1. 遮蔽電子發票號碼（2英文+8數字，如 XG-33104994）
    masked = masked.replace(/[A-Z]{2}[-\s]?\d{8}/gi, '[INVOICE]');

    // 2. 遮蔽統一編號（8位數字，只遮蔽有明確標記的）
    // 有「統編」「賣方」「買方」等關鍵字的
    masked = masked.replace(/(?:統[一]?編[號]?|賣方|買方|營利事業)[:：]?\s*\d{8}/g, '[TAXID]');
    // 處理前面有單字母的情況（如 "i 90045788" 或 "i90045788"）
    masked = masked.replace(/\b[A-Z]\s*\d{8}\b/gi, '[TAXID]');

    // 3. 遮蔽隨機碼（4位數字，在「隨機碼」附近）
    masked = masked.replace(/隨機碼[:：]?\s*\d{4}/g, '[RANDOM]');

    // 4. 遮蔽長數字序列（超過 8 位的數字，如序號、條碼）
    masked = masked.replace(/\d{9,}/g, '[SERIAL]');

    // 5. 遮蔽日期時間格式（改進版，支援更多格式）
    // 5.1 西元年日期時間：2026/01/29 14:30:59 或 2026-01-29T14:30:59
    masked = masked.replace(/\d{4}[-/．.]\d{1,2}[-/．.]\d{1,2}[\sT]+\d{1,2}[:：]\d{2}([:：]\d{2})?/g, '[DATETIME]');
    // 5.2 西元年日期：2026/01/29, 2026-01-29, 2026.01.29
    masked = masked.replace(/\d{4}[-/．.]\d{1,2}[-/．.]\d{1,2}/g, '[DATE]');
    // 5.3 民國年日期時間：115/01/29 14:30
    masked = masked.replace(/\d{2,3}[-/．.]\d{1,2}[-/．.]\d{1,2}\s+\d{1,2}[:：]\d{2}([:：]\d{2})?/g, '[DATETIME]');
    // 5.4 民國年日期：115/01/29, 113-12-25
    masked = masked.replace(/\d{2,3}[-/．.]\d{1,2}[-/．.]\d{1,2}/g, '[DATE]');
    // 5.5 中文日期格式：115年01月29日, 2026年1月29日
    masked = masked.replace(/\d{2,4}年\d{1,2}月\d{1,2}日/g, '[DATE]');
    // 5.6 獨立時間格式：14:30, 14:30:59
    masked = masked.replace(/\b\d{1,2}[:：]\d{2}([:：]\d{2})?\b/g, '[TIME]');

    // 6. 遮蔽單字母 + 數字的編碼（如 "B 1542"）
    // 這類通常是商品代碼或數量代碼，不是金額
    // 注意：只匹配空格（非換行），避免誤傷獨立行的數字
    masked = masked.replace(/\b[A-DF-Z][ \t]+\d{3,5}\b/gi, '[CODE]');

    // 7. 遮蔽包含特殊符號的數字序列（如 "1067 £ 01"、"SA2601220197"）
    masked = masked.replace(/\d+\s*[£€¥]\s*\d+/g, '[CURRENCY_CODE]');
    masked = masked.replace(/[A-Z]{2}\d{10,}/gi, '[SERIAL]');

    // 8. 遮蔽電話號碼格式（如 02-1234-5678, 0912-345-678）
    masked = masked.replace(/\d{2,4}[-－]\d{3,4}[-－]\d{3,4}/g, '[PHONE]');

    this.logger.debug(`遮蔽處理後: ${masked}`);
    return masked;
  }

  /**
   * 從原始文字中提取日期
   *
   * 常見格式：
   * - 2026/01/29
   * - 2026-01-29
   * - 115/01/29 (民國年)
   * - 115年1月29日
   */
  extractDate(text: string): Date | undefined {
    const today = new Date();
    const currentYear = today.getFullYear();

    // 西元年格式
    const westernPatterns = [
      /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/,
      /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    ];

    for (const pattern of westernPatterns) {
      const match = text.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);

        // 驗證合理性
        if (year >= 2020 && year <= currentYear + 1 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          try {
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime()) && date <= today) {
              return date;
            }
          } catch {
            continue;
          }
        }
      }
    }

    // 民國年格式
    const rocPatterns = [
      /(\d{2,3})[/\-.](\d{1,2})[/\-.](\d{1,2})/,
      /(\d{2,3})年(\d{1,2})月(\d{1,2})日/,
    ];

    for (const pattern of rocPatterns) {
      const match = text.match(pattern);
      if (match) {
        let year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);

        // 民國年轉西元年（民國年 < 200）
        if (year < 200) {
          year += 1911;
        }

        // 驗證合理性
        if (year >= 2020 && year <= currentYear + 1 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          try {
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime()) && date <= today) {
              return date;
            }
          } catch {
            continue;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * 從原始文字中提取電子發票號碼
   *
   * 台灣電子發票格式：2 個英文字母 + 8 個數字
   * 例如：XG-33104994, AB12345678
   */
  extractInvoiceNumber(text: string): string | undefined {
    // 電子發票號碼格式：2英文 + 8數字（可能有分隔符號）
    const pattern = /([A-Z]{2})[-\s]?(\d{8})/i;
    const match = text.match(pattern);

    if (match) {
      // 標準化格式：大寫英文 + 連字號 + 數字
      const invoiceNumber = `${match[1].toUpperCase()}-${match[2]}`;
      this.logger.debug(`提取電子發票號碼: ${invoiceNumber}`);
      return invoiceNumber;
    }

    return undefined;
  }

  /**
   * 完整解析收據文字
   * @param language - 偵測到的語言代碼（ja, ko, th, en），用於啟用多語言關鍵字
   */
  parseReceipt(text: string, language?: string): {
    companyName?: string;
    taxId?: string;
    amount?: number;
    date?: Date;
    invoiceNumber?: string;
  } {
    const result = {
      companyName: this.extractCompanyName(text),
      taxId: this.extractTaxId(text),
      amount: this.extractAmount(text, language),
      date: this.extractDate(text),
      invoiceNumber: this.extractInvoiceNumber(text),
    };

    this.logger.debug(`收據解析結果: ${JSON.stringify({
      ...result,
      date: result.date?.toISOString(),
      language,
    })}`);

    return result;
  }
}
