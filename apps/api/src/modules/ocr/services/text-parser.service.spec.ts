import { Test, TestingModule } from '@nestjs/testing';
import { TextParserService } from './text-parser.service';

describe('TextParserService', () => {
  let service: TextParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextParserService],
    }).compile();

    service = module.get<TextParserService>(TextParserService);
  });

  // ============================
  // extractFranchiseName
  // ============================
  describe('extractFranchiseName', () => {
    it('應識別 7-ELEVEN', () => {
      expect(service.extractFranchiseName('7-ELEVEN 門市')).toBe('7-ELEVEN');
    });

    it('應識別 7-11 簡寫', () => {
      expect(service.extractFranchiseName('7-11 統一超商')).toBe('7-ELEVEN');
    });

    it('應識別全家便利商店', () => {
      expect(service.extractFranchiseName('全家便利商店 FamilyMart')).toBe('全家便利商店');
    });

    it('應識別星巴克', () => {
      expect(service.extractFranchiseName('Starbucks Coffee')).toBe('星巴克');
    });

    it('應識別全聯福利中心', () => {
      expect(service.extractFranchiseName('全聯福利中心 PX MART')).toBe('全聯福利中心');
    });

    it('應識別好市多 COSTCO', () => {
      expect(service.extractFranchiseName('COSTCO 好市多')).toBe('好市多');
    });

    it('應識別台灣高鐵', () => {
      expect(service.extractFranchiseName('台灣高鐵 THSR')).toBe('台灣高鐵');
    });

    it('應識別 OCR 噪音下的 7-ELEVEN', () => {
      expect(service.extractFranchiseName('171-1E1L1E1V1E1n')).toBe('7-ELEVEN');
    });

    // 日本品牌
    it('應識別マツモトキヨシ (松本清)', () => {
      expect(service.extractFranchiseName('マツモトキヨシ')).toBe('マツモトキヨシ');
    });

    it('應識別ココカラファイン', () => {
      expect(service.extractFranchiseName('ココカラファイン銀座4丁目店')).toBe('ココカラファイン');
    });

    it('應識別ローソン (Lawson)', () => {
      expect(service.extractFranchiseName('ローソン 新宿店')).toBe('Lawson');
    });

    it('應識別 EXCELSIOR CAFFÉ', () => {
      expect(service.extractFranchiseName('EXCELSIOR CAFFÉ')).toBe('EXCELSIOR CAFFÉ');
    });

    it('應識別蔦屋書店 TSUTAYA', () => {
      expect(service.extractFranchiseName('蔦屋書店 TSUTAYA BOOKS')).toBe('蔦屋書店');
    });

    // 韓國品牌
    it('應識別 LOTTE DUTY FREE', () => {
      expect(service.extractFranchiseName('LOTTE DUTY FREE')).toBe('LOTTE DUTY FREE');
    });

    it('應識別바비렛', () => {
      expect(service.extractFranchiseName('바비렛 충무로점')).toBe('바비렛');
    });

    it('應識別 OLIVE YOUNG', () => {
      expect(service.extractFranchiseName('OLIVE YOUNG 明洞店')).toBe('OLIVE YOUNG');
    });

    it('無法識別未知品牌應返回 undefined', () => {
      expect(service.extractFranchiseName('某某不知名小吃店')).toBeUndefined();
    });

    it('空字串應返回 undefined', () => {
      expect(service.extractFranchiseName('')).toBeUndefined();
    });
  });

  // ============================
  // extractCompanyName
  // ============================
  describe('extractCompanyName', () => {
    it('應優先識別連鎖品牌', () => {
      const text = '統一超商股份有限公司\n7-ELEVEN\n台北市中正區';
      expect(service.extractCompanyName(text)).toBe('7-ELEVEN');
    });

    it('應識別含公司後綴的名稱', () => {
      const text = '某某科技股份有限公司\n台北市信義區';
      expect(service.extractCompanyName(text)).toBe('某某科技股份有限公司');
    });

    it('應識別有限公司', () => {
      const text = '好吃餐飲有限公司\n統編: 12345678';
      expect(service.extractCompanyName(text)).toBe('好吃餐飲有限公司');
    });

    it('應排除純數字行', () => {
      const text = '12345678\n好吃小吃\n$350';
      expect(service.extractCompanyName(text)).toBe('好吃小吃');
    });

    it('應排除發票號碼格式', () => {
      const text = 'AB-12345678\n好吃餐廳\n合計 350';
      expect(service.extractCompanyName(text)).toBe('好吃餐廳');
    });

    it('應排除日期格式行', () => {
      const text = '2026/03/15\n美味小吃\n$250';
      expect(service.extractCompanyName(text)).toBe('美味小吃');
    });

    it('應識別受保護品牌名稱', () => {
      const text = 'KFC\n肯德基';
      expect(service.extractCompanyName(text)).toBe('肯德基');
    });

    it('空字串應返回 undefined', () => {
      expect(service.extractCompanyName('')).toBeUndefined();
    });
  });

  // ============================
  // extractAmount
  // ============================
  describe('extractAmount', () => {
    it('應提取「應付金額」格式', () => {
      expect(service.extractAmount('應付金額 NT$350')).toBe(350);
    });

    it('應提取「總計」格式', () => {
      expect(service.extractAmount('總計 $1,280')).toBe(1280);
    });

    it('應提取「合計」格式', () => {
      expect(service.extractAmount('合計：580')).toBe(580);
    });

    it('應提取「小計」格式', () => {
      expect(service.extractAmount('小計 $200\n折扣 -$30\n應付 $170')).toBe(170);
    });

    it('應優先取「應付」而非「小計」', () => {
      const text = '小計 $250\n服務費 $25\n應付金額 $275';
      expect(service.extractAmount(text)).toBe(275);
    });

    it('應忽略「找零」金額', () => {
      const text = '應付 $500\n現金 $1000\n找零 $500';
      expect(service.extractAmount(text)).toBe(500);
    });

    it('應忽略「折扣」金額', () => {
      const text = '原價 $400\n折扣 $50\n應付 $350';
      expect(service.extractAmount(text)).toBe(350);
    });

    it('應提取帶 NT$ 前綴的金額', () => {
      expect(service.extractAmount('NT$450')).toBe(450);
    });

    it('應提取帶「元」後綴的金額', () => {
      expect(service.extractAmount('共計 350元')).toBe(350);
    });

    it('應提取千分位格式金額', () => {
      expect(service.extractAmount('總計 NT$12,500')).toBe(12500);
    });

    it('應遮蔽日期避免誤判', () => {
      const text = '2026/03/15\n合計 $350';
      expect(service.extractAmount(text)).toBe(350);
    });

    it('應遮蔽發票號碼避免誤判', () => {
      const text = 'AB-33104994\n合計 $120';
      expect(service.extractAmount(text)).toBe(120);
    });

    it('應遮蔽統一編號避免誤判', () => {
      const text = '統編: 12345678\n合計 $200';
      expect(service.extractAmount(text)).toBe(200);
    });

    it('應遮蔽電話號碼避免誤判', () => {
      const text = '電話 02-1234-5678\n合計 $300';
      expect(service.extractAmount(text)).toBe(300);
    });

    it('無法識別金額應返回 undefined', () => {
      expect(service.extractAmount('沒有任何數字的文字')).toBeUndefined();
    });

    it('空字串應返回 undefined', () => {
      expect(service.extractAmount('')).toBeUndefined();
    });
  });

  // ============================
  // extractDate
  // ============================
  describe('extractDate', () => {
    it('應提取西元年日期 (斜線)', () => {
      const date = service.extractDate('2025/03/15');
      expect(date).toBeDefined();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(2); // 0-indexed
      expect(date!.getDate()).toBe(15);
    });

    it('應提取西元年日期 (連字號)', () => {
      const date = service.extractDate('2025-01-20');
      expect(date).toBeDefined();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(0);
      expect(date!.getDate()).toBe(20);
    });

    it('應提取中文格式西元年日期', () => {
      const date = service.extractDate('2025年3月15日');
      expect(date).toBeDefined();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(2);
    });

    it('應提取民國年日期', () => {
      const date = service.extractDate('114/03/15');
      expect(date).toBeDefined();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(2);
      expect(date!.getDate()).toBe(15);
    });

    it('應提取三位數民國年', () => {
      const date = service.extractDate('114/01/01');
      expect(date).toBeDefined();
      expect(date!.getFullYear()).toBe(2025);
    });

    it('應拒絕未來日期', () => {
      const futureDate = service.extractDate('2099/12/31');
      expect(futureDate).toBeUndefined();
    });

    it('應拒絕過舊日期', () => {
      expect(service.extractDate('2019/01/01')).toBeUndefined();
    });

    it('無日期文字應返回 undefined', () => {
      expect(service.extractDate('沒有日期')).toBeUndefined();
    });

    it('空字串應返回 undefined', () => {
      expect(service.extractDate('')).toBeUndefined();
    });
  });

  // ============================
  // extractTaxId
  // ============================
  describe('extractTaxId', () => {
    it('應提取「統編:」格式', () => {
      expect(service.extractTaxId('統編: 12345678')).toBe('12345678');
    });

    it('應提取「統一編號」格式', () => {
      expect(service.extractTaxId('統一編號：87654321')).toBe('87654321');
    });

    it('應拒絕全相同數字', () => {
      expect(service.extractTaxId('統編: 11111111')).toBeUndefined();
    });

    it('無統編應返回 undefined', () => {
      expect(service.extractTaxId('沒有統編')).toBeUndefined();
    });
  });

  // ============================
  // extractInvoiceNumber
  // ============================
  describe('extractInvoiceNumber', () => {
    it('應提取有連字號的發票號碼', () => {
      expect(service.extractInvoiceNumber('XG-33104994')).toBe('XG-33104994');
    });

    it('應提取無連字號的發票號碼', () => {
      expect(service.extractInvoiceNumber('AB12345678')).toBe('AB-12345678');
    });

    it('應轉為大寫', () => {
      expect(service.extractInvoiceNumber('ab12345678')).toBe('AB-12345678');
    });

    it('無發票號碼應返回 undefined', () => {
      expect(service.extractInvoiceNumber('沒有發票')).toBeUndefined();
    });
  });

  // ============================
  // parseReceipt (整合測試)
  // ============================
  describe('parseReceipt', () => {
    it('應完整解析 7-ELEVEN 收據', () => {
      const text = `統一超商股份有限公司
7-ELEVEN 松山門市
統一編號: 22556677
2025/03/15 14:30
AB-12345678
咖啡 $65
三明治 $45
合計 $110`;

      const result = service.parseReceipt(text);
      expect(result.companyName).toBe('7-ELEVEN');
      expect(result.amount).toBe(110);
      expect(result.invoiceNumber).toBe('AB-12345678');
      expect(result.date).toBeDefined();
      expect(result.date!.getFullYear()).toBe(2025);
    });

    it('應解析全聯收據', () => {
      const text = `全聯福利中心
統編: 03077809
114/02/28
牛奶 $75
雞蛋 $65
總計 NT$140`;

      const result = service.parseReceipt(text);
      expect(result.companyName).toBe('全聯福利中心');
      expect(result.amount).toBe(140);
      expect(result.date).toBeDefined();
      expect(result.date!.getFullYear()).toBe(2025);
    });

    it('應解析無品牌的一般收據', () => {
      const text = `好味道餐廳
台北市大安區
2025/03/20
炒飯 $120
湯 $30
應付金額 $150`;

      const result = service.parseReceipt(text);
      expect(result.companyName).toBe('好味道餐廳');
      expect(result.amount).toBe(150);
    });

    it('空字串應返回所有 undefined', () => {
      const result = service.parseReceipt('');
      expect(result.companyName).toBeUndefined();
      expect(result.amount).toBeUndefined();
      expect(result.date).toBeUndefined();
      expect(result.invoiceNumber).toBeUndefined();
    });
  });

  // ============================
  // 多語言金額提取 (Phase 2)
  // ============================
  describe('extractAmount — 日文收據', () => {
    it('應提取日文「合計」格式 (松本清)', () => {
      const text = 'マツモトキヨシ\n合計 ¥11,574\nお釣り ¥430';
      expect(service.extractAmount(text, 'ja')).toBe(11574);
    });

    it('應提取日文「合計」大金額 (ココカラファイン)', () => {
      const text = '小計 11点 ¥31,767\n部門割引 3% -954\n合計 ¥30,813';
      expect(service.extractAmount(text, 'ja')).toBe(30813);
    });

    it('應排除日文「お釣り」(找零)', () => {
      const text = '合計 ¥440\nお釣り ¥560';
      expect(service.extractAmount(text, 'ja')).toBe(440);
    });

    it('應提取含稅合計「税込」', () => {
      const text = '合 計(税込) 2,160\n内税(税抜) 2,000\n消費税 160';
      expect(service.extractAmount(text, 'ja')).toBe(2160);
    });

    it('應處理「¥」後帶逗號分隔的金額', () => {
      expect(service.extractAmount('¥23,920非', 'ja')).toBe(23920);
    });

    it('應處理「円」後綴', () => {
      expect(service.extractAmount('合計 1980円', 'ja')).toBe(1980);
    });

    it('應排除日文「割引」(折扣)', () => {
      const text = 'クーポン割引 -56\n合計 ¥11,574';
      expect(service.extractAmount(text, 'ja')).toBe(11574);
    });
  });

  describe('extractAmount — 韓文收據', () => {
    it('應提取韓文「합계금액」格式', () => {
      const text = '합계금액\n110,000\n받은금액\n104,000';
      expect(service.extractAmount(text, 'ko')).toBe(110000);
    });

    it('應排除韓文「받은금액」(收款)', () => {
      const text = '합계금액 110,000\n받은금액 104,000\n현 금 6,000';
      expect(service.extractAmount(text, 'ko')).toBe(110000);
    });

    it('應處理韓文無幣別符號的大金額', () => {
      expect(service.extractAmount('합계 50,000', 'ko')).toBe(50000);
    });
  });

  describe('extractAmount — 英文收據', () => {
    it('應提取 "Total" 格式', () => {
      expect(service.extractAmount('Subtotal $65.00\nTax $5.20\nTotal $70.20', 'en')).toBe(70);
    });

    it('應提取 "Grand Total" 格式', () => {
      expect(service.extractAmount('Grand Total $125.50', 'en')).toBe(126);
    });

    it('應排除 "Change" (找零)', () => {
      const text = 'Total $50.00\nCash $100.00\nChange $50.00';
      expect(service.extractAmount(text, 'en')).toBe(50);
    });
  });

  // ============================
  // 多語言整合測試 (真實收據模擬)
  // ============================
  describe('parseReceipt — 日文收據 (真實資料)', () => {
    it('應解析松本清收據', () => {
      const text = `マツモトキヨシ
株式会社マツモトキヨシ
2016年05月20日(金) 22時29分
領収証
免税取引 (消耗品)
合計 ¥11,574
お釣 ¥430`;

      const result = service.parseReceipt(text, 'ja');
      expect(result.amount).toBe(11574);
      expect(result.companyName).toBeDefined();
    });

    it('應解析 ココカラファイン 收據', () => {
      const text = `ココカラファイン銀座4丁目店
2023年06月24日(土) 11時39分
Tax Free
小計 11点 ¥31,767
部門割引 3% -954
合計 ¥30,813
オンラインクレジット ¥30,813
お釣り ¥0`;

      const result = service.parseReceipt(text, 'ja');
      expect(result.amount).toBe(30813);
      expect(result.date).toBeDefined();
      expect(result.date!.getFullYear()).toBe(2023);
      expect(result.date!.getMonth()).toBe(5); // June = 5
    });

    it('應解析 EXCELSIOR CAFFÉ 收據', () => {
      const text = `EXCELSIOR CAFFÉ
2017/08/02(水) 11:22
イートイン
Lアイスティ ¥440
合計 1点 ¥440
消費税 ¥32`;

      const result = service.parseReceipt(text, 'ja');
      expect(result.amount).toBe(440);
    });
  });

  describe('parseReceipt — 韓文收據 (真實資料)', () => {
    it('應解析바비렛收據', () => {
      const text = `바비렛 충무로점
2025-01-16
합계금액
110,000
받은금액
104,000
현 금(즉시할인)
6,000`;

      const result = service.parseReceipt(text, 'ko');
      expect(result.amount).toBe(110000);
      expect(result.date).toBeDefined();
      expect(result.date!.getFullYear()).toBe(2025);
    });
  });
});
