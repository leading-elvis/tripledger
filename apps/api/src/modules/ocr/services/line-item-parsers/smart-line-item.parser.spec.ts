import { SmartLineItemParser, LineType, ReceiptFormat } from './smart-line-item.parser';

describe('SmartLineItemParser', () => {
  let parser: SmartLineItemParser;

  beforeEach(() => {
    parser = new SmartLineItemParser();
  });

  describe('canParse', () => {
    it('永遠回傳 true（通用解析器）', () => {
      expect(parser.canParse('')).toBe(true);
      expect(parser.canParse('任意文字')).toBe(true);
      expect(parser.canParse('text', '7-ELEVEN')).toBe(true);
    });
  });

  describe('classifyLine', () => {
    it('識別合計行', () => {
      expect(parser.classifyLine('合計 4項 金額 $155').type).toBe(LineType.TOTAL);
      expect(parser.classifyLine('總計 $200').type).toBe(LineType.TOTAL);
      expect(parser.classifyLine('應付金額 150').type).toBe(LineType.TOTAL);
      expect(parser.classifyLine('小計 $100').type).toBe(LineType.TOTAL);
      expect(parser.classifyLine('金額 $155').type).toBe(LineType.TOTAL);
    });

    it('識別折扣行', () => {
      const result = parser.classifyLine('魔爪指定品項2*1Y26* $-23');
      expect(result.type).toBe(LineType.DISCOUNT);
      expect(result.subtotal).toBe(-23);
    });

    it('識別價格明細行', () => {
      const result = parser.classifyLine('$59x 2 $118 TX');
      expect(result.type).toBe(LineType.PRICE_DETAIL);
      expect(result.unitPrice).toBe(59);
      expect(result.quantity).toBe(2);
      expect(result.subtotal).toBe(118);
    });

    it('識別不同格式的價格明細', () => {
      const r1 = parser.classifyLine('$35x1 $35 TX');
      expect(r1.type).toBe(LineType.PRICE_DETAIL);
      expect(r1.unitPrice).toBe(35);
      expect(r1.quantity).toBe(1);
      expect(r1.subtotal).toBe(35);
    });

    it('識別無小計的部分價格行並自動計算', () => {
      const r1 = parser.classifyLine('$35x1');
      expect(r1.type).toBe(LineType.PRICE_DETAIL);
      expect(r1.unitPrice).toBe(35);
      expect(r1.quantity).toBe(1);
      expect(r1.subtotal).toBe(35);

      const r2 = parser.classifyLine('$59x 2');
      expect(r2.type).toBe(LineType.PRICE_DETAIL);
      expect(r2.unitPrice).toBe(59);
      expect(r2.quantity).toBe(2);
      expect(r2.subtotal).toBe(118);
    });

    it('識別孤立金額行為後設資料', () => {
      expect(parser.classifyLine('$118 TX').type).toBe(LineType.METADATA);
      expect(parser.classifyLine('$35 TX').type).toBe(LineType.METADATA);
      expect(parser.classifyLine('$1000').type).toBe(LineType.METADATA);
      expect(parser.classifyLine('$845').type).toBe(LineType.METADATA);
    });

    it('識別品項+金額同行', () => {
      const result = parser.classifyLine('紅茶拿鐵          65');
      expect(result.type).toBe(LineType.ITEM_WITH_PRICE);
      expect(result.subtotal).toBe(65);
    });

    it('識別僅品名行', () => {
      expect(parser.classifyLine('魔爪超越能量碳酸飲料can35').type).toBe(LineType.ITEM_NAME_ONLY);
      expect(parser.classifyLine('*左岸咖啡館奶茶240ml(杯)').type).toBe(LineType.ITEM_NAME_ONLY);
    });

    it('識別後設資料行', () => {
      expect(parser.classifyLine('找零 $845').type).toBe(LineType.METADATA);
      expect(parser.classifyLine('現金 $1000').type).toBe(LineType.METADATA);
      expect(parser.classifyLine('店號：182317 機02 收銀員1742').type).toBe(LineType.METADATA);
      expect(parser.classifyLine('會員累點 GID11106****09307').type).toBe(LineType.METADATA);
    });

    it('識別分隔線', () => {
      expect(parser.classifyLine('--------').type).toBe(LineType.SEPARATOR);
      expect(parser.classifyLine('========').type).toBe(LineType.SEPARATOR);
    });

    it('識別日期行為後設資料', () => {
      expect(parser.classifyLine('2026-01-30 10:54:02').type).toBe(LineType.METADATA);
    });
  });

  describe('extractTrailingPrice', () => {
    it('提取行尾 $ 金額', () => {
      expect(parser.extractTrailingPrice('紅茶拿鐵  $65')).toBe(65);
    });

    it('提取行尾空白分隔的金額', () => {
      expect(parser.extractTrailingPrice('紅茶拿鐵          65')).toBe(65);
    });

    it('不提取品名中嵌入的數字', () => {
      // "240ml" 中的 240 不應被視為金額
      expect(parser.extractTrailingPrice('左岸咖啡館奶茶240ml')).toBeNull();
    });

    it('對 PRICE_DETAIL 格式回傳 null', () => {
      expect(parser.extractTrailingPrice('$59x 2 $118 TX')).toBeNull();
    });
  });

  describe('cleanItemName', () => {
    it('移除 * 前綴', () => {
      expect(parser.cleanItemName('*左岸咖啡館奶茶240ml(杯)')).toBe('左岸咖啡館奶茶240ml(杯)');
    });

    it('移除 (A) 前綴', () => {
      expect(parser.cleanItemName('(A)統一陽光無加糖高纖豆漿')).toBe('統一陽光無加糖高纖豆漿');
    });

    it('保留無前綴的品名', () => {
      expect(parser.cleanItemName('魔爪超越能量碳酸飲料can35')).toBe('魔爪超越能量碳酸飲料can35');
    });
  });

  describe('parse — 便利商店雙行式', () => {
    const sevenElevenReceipt = [
      '7-ELEVEN',
      '載具交易明細',
      '店名：燿福',
      '店號：182317 機02 收銀員1742',
      '交易序號：959162',
      '交易時間：2026-01-30 10:54:02',
      '魔爪超越能量碳酸飲料can35',
      '$59x 2 $118 TX',
      '*左岸咖啡館奶茶240ml(杯)',
      '$35x 1 $35 TX',
      '(A)統一陽光無加糖高纖豆漿',
      '$25x 1 $25 TX',
      '魔爪指定品項2*1Y26* $-23',
      '會員累點 GID11106****09307',
      '合計 4項 金額 $155',
      '現金 $1000 找零 $845',
    ].join('\n');

    it('解析出 4 個品項（3 正常 + 1 折扣）', async () => {
      const items = await parser.parse(sevenElevenReceipt);
      expect(items).toHaveLength(4);
    });

    it('正確解析品名、單價、數量、小計', async () => {
      const items = await parser.parse(sevenElevenReceipt);

      expect(items[0].name).toBe('魔爪超越能量碳酸飲料can35');
      expect(items[0].unitPrice).toBe(59);
      expect(items[0].quantity).toBe(2);
      expect(items[0].subtotal).toBe(118);
      expect(items[0].isDiscount).toBe(false);

      expect(items[1].name).toBe('左岸咖啡館奶茶240ml(杯)');
      expect(items[1].unitPrice).toBe(35);
      expect(items[1].quantity).toBe(1);
      expect(items[1].subtotal).toBe(35);

      expect(items[2].name).toBe('統一陽光無加糖高纖豆漿');
      expect(items[2].unitPrice).toBe(25);
      expect(items[2].quantity).toBe(1);
      expect(items[2].subtotal).toBe(25);
    });

    it('正確識別折扣項目', async () => {
      const items = await parser.parse(sevenElevenReceipt);
      const discount = items[3];
      expect(discount.isDiscount).toBe(true);
      expect(discount.subtotal).toBe(-23);
    });

    it('品項總和等於 155', async () => {
      const items = await parser.parse(sevenElevenReceipt);
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);
      expect(total).toBe(155);
    });
  });

  describe('parse — 單行式（超市/餐廳）', () => {
    const singleLineReceipt = [
      '全聯福利中心',
      '統一編號：12345678',
      '--------',
      '鮮乳坊鮮奶          89',
      '光泉豆漿          25',
      '台灣啤酒          35',
      '--------',
      '合計 $149',
    ].join('\n');

    it('解析出 3 個品項', async () => {
      const items = await parser.parse(singleLineReceipt);
      expect(items).toHaveLength(3);
    });

    it('正確提取品名和金額', async () => {
      const items = await parser.parse(singleLineReceipt);
      expect(items[0].name).toBe('鮮乳坊鮮奶');
      expect(items[0].subtotal).toBe(89);
      expect(items[0].quantity).toBe(1);

      expect(items[1].name).toBe('光泉豆漿');
      expect(items[1].subtotal).toBe(25);

      expect(items[2].name).toBe('台灣啤酒');
      expect(items[2].subtotal).toBe(35);
    });

    it('品項總和等於 149', async () => {
      const items = await parser.parse(singleLineReceipt);
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);
      expect(total).toBe(149);
    });
  });

  describe('parse — 普通發票格式', () => {
    const invoiceReceipt = [
      '小吃店',
      '牛肉麵          $120',
      '小菜          $30',
      '飲料          $20',
      '合計 $170',
    ].join('\n');

    it('解析出 3 個品項', async () => {
      const items = await parser.parse(invoiceReceipt);
      expect(items).toHaveLength(3);
    });

    it('正確提取帶 $ 符號的金額', async () => {
      const items = await parser.parse(invoiceReceipt);
      expect(items[0].name).toBe('牛肉麵');
      expect(items[0].subtotal).toBe(120);
    });
  });

  describe('parse — OCR 順序錯亂（實際掃描結果）', () => {
    // 實際 Google Cloud Vision OCR 的輸出：
    // 價格行被拆分、品名與價格順序錯亂
    const garbledOcrReceipt = [
      '7-ELEVEn.',
      '載具交易明細',
      '店名:燿福',
      '店號:182317機02 收銀員1742',
      '交易序號:959162',
      '交易時間:2026-01-30 10:54:02',
      '魔爪超越能量碳酸飲料can35',
      '$59x 2',
      '$118 TX',
      '$35x1',
      '$25x1',
      '*左岸咖啡館奶茶240ml(杯)',
      '(A)統一陽光無加糖高纖豆漿',
      '魔爪指定品項2*1Y26* $-23',
      '會員累點 GID11106****09307',
      '$35 TX',
      '$25 TX',
      '口罩',
      '現金',
      '$1000',
      '金額 $155',
      '找零',
      '$845',
      '請至OPEN POINT APP查詢點數',
      '退貨請憑交易明細及載具(卡片)',
    ].join('\n');

    it('解析出 4 個品項（3 正常 + 1 折扣）', async () => {
      const items = await parser.parse(garbledOcrReceipt);
      expect(items).toHaveLength(4);
    });

    it('正確配對品名與價格（含順序回填）', async () => {
      const items = await parser.parse(garbledOcrReceipt);

      expect(items[0].name).toBe('魔爪超越能量碳酸飲料can35');
      expect(items[0].unitPrice).toBe(59);
      expect(items[0].quantity).toBe(2);
      expect(items[0].subtotal).toBe(118);

      expect(items[1].name).toBe('左岸咖啡館奶茶240ml(杯)');
      expect(items[1].subtotal).toBe(35);

      expect(items[2].name).toBe('統一陽光無加糖高纖豆漿');
      expect(items[2].subtotal).toBe(25);
    });

    it('正確識別折扣項目', async () => {
      const items = await parser.parse(garbledOcrReceipt);
      const discount = items[3];
      expect(discount.isDiscount).toBe(true);
      expect(discount.subtotal).toBe(-23);
    });

    it('品項總和等於 155', async () => {
      const items = await parser.parse(garbledOcrReceipt);
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);
      expect(total).toBe(155);
    });
  });

  describe('parse — 邊界情況', () => {
    it('空文字回傳空陣列', async () => {
      const items = await parser.parse('');
      expect(items).toHaveLength(0);
    });

    it('只有標頭無品項回傳空陣列', async () => {
      const text = '7-ELEVEN\n店名：中山\n合計 $0';
      const items = await parser.parse(text);
      expect(items).toHaveLength(0);
    });

    it('只有一行文字回傳空陣列', async () => {
      const items = await parser.parse('單行文字');
      expect(items).toHaveLength(0);
    });
  });

  describe('detectFormat', () => {
    it('有 PRICE_DETAIL 行時偵測為雙行式', () => {
      const lines = [
        { text: '品名', type: LineType.ITEM_NAME_ONLY },
        { text: '$50x1 $50', type: LineType.PRICE_DETAIL, unitPrice: 50, quantity: 1, subtotal: 50 },
      ];
      expect(parser['detectFormat'](lines)).toBe(ReceiptFormat.TWO_LINE);
    });

    it('只有 ITEM_WITH_PRICE 時偵測為單行式', () => {
      const lines = [
        { text: '品名  50', type: LineType.ITEM_WITH_PRICE, subtotal: 50 },
        { text: '品名  30', type: LineType.ITEM_WITH_PRICE, subtotal: 30 },
      ];
      expect(parser['detectFormat'](lines)).toBe(ReceiptFormat.SINGLE_LINE);
    });
  });
});
