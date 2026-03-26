import { LineItemParserService } from './line-item-parser.service';

describe('LineItemParserService', () => {
  let service: LineItemParserService;

  beforeEach(() => {
    service = new LineItemParserService();
  });

  describe('parseLineItems', () => {
    it('文字太短時回傳 null', async () => {
      const result = await service.parseLineItems('短');
      expect(result).toBeNull();
    });

    it('空字串回傳 null', async () => {
      const result = await service.parseLineItems('');
      expect(result).toBeNull();
    });

    it('無品項的文字回傳 null', async () => {
      const text = '這是一段沒有品項的普通文字，長度超過十個字但不包含任何收據格式。';
      const result = await service.parseLineItems(text);
      expect(result).toBeNull();
    });

    it('解析 7-ELEVEN 收據並回傳結果', async () => {
      const receipt = [
        '7-ELEVEN',
        '店名：燿福',
        '交易時間：2026-01-30 10:54:02',
        '魔爪超越能量碳酸飲料can35',
        '$59x 2 $118 TX',
        '*左岸咖啡館奶茶240ml(杯)',
        '$35x 1 $35 TX',
        '(A)統一陽光無加糖高纖豆漿',
        '$25x 1 $25 TX',
        '魔爪指定品項2*1Y26* $-23',
        '合計 4項 金額 $155',
        '現金 $1000 找零 $845',
      ].join('\n');

      const result = await service.parseLineItems(receipt, '7-ELEVEN', 155);

      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(4);
      expect(result!.itemsTotal).toBe(155);
      expect(result!.parserUsed).toBe('SmartLineItemParser');
    });

    it('品項總和與總額吻合時信心度較高', async () => {
      const receipt = [
        '店名',
        '紅茶          30',
        '咖啡          50',
        '合計 $80',
      ].join('\n');

      const result = await service.parseLineItems(receipt, undefined, 80);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('品項總和與總額不符時信心度較低', async () => {
      const receipt = [
        '店名',
        '紅茶          30',
        '咖啡          50',
        '合計 $80',
      ].join('\n');

      // 告知總額是 200，但品項只有 80
      const result = await service.parseLineItems(receipt, undefined, 200);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBeLessThan(0.9);
    });
  });
});
