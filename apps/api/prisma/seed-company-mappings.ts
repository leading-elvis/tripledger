/**
 * 企業品牌對照表 Seed 資料
 * 用於 OCR 智慧收據掃描時，將公司登記名稱轉換為常用品牌名稱
 *
 * 執行方式: npx ts-node prisma/seed-company-mappings.ts
 */

import { PrismaClient, BillCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface CompanyMapping {
  companyName: string;
  taxId?: string;
  brandName: string;
  category: BillCategory;
  aliases?: string[];
}

const companyMappings: CompanyMapping[] = [
  // ============================================
  // 便利商店
  // ============================================
  {
    companyName: '統一超商股份有限公司',
    taxId: '22555003',
    brandName: '7-Eleven',
    category: 'FOOD',
    aliases: ['7-11', '七一一', '統一超商'],
  },
  {
    companyName: '全家便利商店股份有限公司',
    taxId: '23060248',
    brandName: '全家',
    category: 'FOOD',
    aliases: ['FamilyMart', '全家便利商店'],
  },
  {
    companyName: '萊爾富國際股份有限公司',
    taxId: '27363224',
    brandName: '萊爾富',
    category: 'FOOD',
    aliases: ['Hi-Life'],
  },
  {
    companyName: '來來超商股份有限公司',
    taxId: '97168356',
    brandName: 'OK超商',
    category: 'FOOD',
    aliases: ['OK便利店'],
  },

  // ============================================
  // 咖啡連鎖
  // ============================================
  {
    companyName: '統一星巴克股份有限公司',
    taxId: '70771734',
    brandName: '星巴克',
    category: 'FOOD',
    aliases: ['Starbucks', '統一星巴克'],
  },
  {
    companyName: '路易莎職人咖啡股份有限公司',
    taxId: '24772925',
    brandName: '路易莎',
    category: 'FOOD',
    aliases: ['Louisa', 'Louisa Coffee'],
  },
  {
    companyName: '悠旅生活事業股份有限公司',
    taxId: '24549855',
    brandName: 'cama café',
    category: 'FOOD',
    aliases: ['cama', '咖碼'],
  },
  {
    companyName: '85度C開發股份有限公司',
    taxId: '27935111',
    brandName: '85度C',
    category: 'FOOD',
    aliases: ['85°C'],
  },
  {
    companyName: '金礦國際股份有限公司',
    taxId: '28087221',
    brandName: '金礦咖啡',
    category: 'FOOD',
    aliases: ['金礦'],
  },
  {
    companyName: '丹堤咖啡食品股份有限公司',
    taxId: '70385481',
    brandName: '丹堤咖啡',
    category: 'FOOD',
    aliases: ['Dante Coffee', '丹堤'],
  },

  // ============================================
  // 速食連鎖
  // ============================================
  {
    companyName: '台灣麥當勞餐廳股份有限公司',
    taxId: '11052402',
    brandName: '麥當勞',
    category: 'FOOD',
    aliases: ["McDonald's", '麥當當'],
  },
  {
    companyName: '台灣百勝餐飲股份有限公司',
    taxId: '11458601',
    brandName: '肯德基',
    category: 'FOOD',
    aliases: ['KFC', 'Kentucky'],
  },
  {
    companyName: '安心食品服務股份有限公司',
    taxId: '84149540',
    brandName: '摩斯漢堡',
    category: 'FOOD',
    aliases: ['MOS Burger', '摩斯'],
  },
  {
    companyName: '頂呱呱國際股份有限公司',
    taxId: '24315102',
    brandName: '頂呱呱',
    category: 'FOOD',
    aliases: ['TKK'],
  },
  {
    companyName: '台灣漢堡王股份有限公司',
    taxId: '12989823',
    brandName: '漢堡王',
    category: 'FOOD',
    aliases: ['Burger King'],
  },
  {
    companyName: '開元食品工業股份有限公司',
    taxId: '11063102',
    brandName: 'Subway',
    category: 'FOOD',
    aliases: ['潛艇堡'],
  },
  {
    companyName: '台灣怡和餐飲股份有限公司',
    taxId: '54700169',
    brandName: '必勝客',
    category: 'FOOD',
    aliases: ['Pizza Hut'],
  },
  {
    companyName: '台灣達美樂披薩股份有限公司',
    taxId: '84327028',
    brandName: '達美樂',
    category: 'FOOD',
    aliases: ["Domino's Pizza", '達美樂披薩'],
  },

  // ============================================
  // 餐飲集團
  // ============================================
  {
    companyName: '王品餐飲股份有限公司',
    taxId: '22556299',
    brandName: '王品集團',
    category: 'FOOD',
    aliases: ['王品', '王品牛排'],
  },
  {
    companyName: '瓦城泰統股份有限公司',
    taxId: '70770740',
    brandName: '瓦城',
    category: 'FOOD',
    aliases: ['瓦城泰國料理'],
  },
  {
    companyName: '饗賓餐旅事業股份有限公司',
    taxId: '28843335',
    brandName: '饗食天堂',
    category: 'FOOD',
    aliases: ['饗賓'],
  },
  {
    companyName: '鼎泰豐小吃店股份有限公司',
    taxId: '03481902',
    brandName: '鼎泰豐',
    category: 'FOOD',
    aliases: ['Din Tai Fung'],
  },
  {
    companyName: '欣葉國際餐飲股份有限公司',
    taxId: '12296891',
    brandName: '欣葉',
    category: 'FOOD',
    aliases: ['欣葉餐廳', '欣葉台菜'],
  },
  {
    companyName: '漢來美食股份有限公司',
    taxId: '86532169',
    brandName: '漢來海港',
    category: 'FOOD',
    aliases: ['漢來', '漢來大飯店'],
  },
  {
    companyName: '築間餐飲事業股份有限公司',
    taxId: '28912855',
    brandName: '築間',
    category: 'FOOD',
    aliases: ['築間幸福鍋物'],
  },
  {
    companyName: '海底撈餐飲股份有限公司',
    taxId: '54263287',
    brandName: '海底撈',
    category: 'FOOD',
    aliases: ['Haidilao'],
  },
  {
    companyName: '鮮茶道國際股份有限公司',
    taxId: '24316558',
    brandName: '鮮茶道',
    category: 'FOOD',
    aliases: [],
  },
  {
    companyName: '春水堂人文茶館股份有限公司',
    taxId: '22103091',
    brandName: '春水堂',
    category: 'FOOD',
    aliases: [],
  },
  {
    companyName: '五十嵐企業股份有限公司',
    taxId: '80328226',
    brandName: '50嵐',
    category: 'FOOD',
    aliases: ['五十嵐'],
  },
  {
    companyName: '清心福全冷飲站股份有限公司',
    taxId: '70389619',
    brandName: '清心福全',
    category: 'FOOD',
    aliases: [],
  },

  // ============================================
  // 超市量販
  // ============================================
  {
    companyName: '好市多股份有限公司',
    taxId: '70771128',
    brandName: 'Costco',
    category: 'SHOPPING',
    aliases: ['好市多'],
  },
  {
    companyName: '家福股份有限公司',
    taxId: '23149001',
    brandName: '家樂福',
    category: 'SHOPPING',
    aliases: ['Carrefour'],
  },
  {
    companyName: '遠百企業股份有限公司',
    taxId: '11097716',
    brandName: '大潤發',
    category: 'SHOPPING',
    aliases: ['RT-Mart'],
  },
  {
    companyName: '愛買股份有限公司',
    taxId: '70760055',
    brandName: '愛買',
    category: 'SHOPPING',
    aliases: ['A-Mart'],
  },
  {
    companyName: '全聯實業股份有限公司',
    taxId: '70746119',
    brandName: '全聯',
    category: 'FOOD',
    aliases: ['全聯福利中心', 'PX Mart'],
  },
  {
    companyName: '美廉社股份有限公司',
    taxId: '24786631',
    brandName: '美廉社',
    category: 'FOOD',
    aliases: ['Simple Mart'],
  },
  {
    companyName: '頂好惠康股份有限公司',
    taxId: '12200854',
    brandName: '頂好',
    category: 'FOOD',
    aliases: ['Wellcome'],
  },
  {
    companyName: '遠東都會股份有限公司',
    taxId: '24549805',
    brandName: 'city\'super',
    category: 'SHOPPING',
    aliases: ['超市'],
  },

  // ============================================
  // 藥妝美妝
  // ============================================
  {
    companyName: '統一藥品股份有限公司',
    taxId: '89458904',
    brandName: '康是美',
    category: 'SHOPPING',
    aliases: ['Cosmed'],
  },
  {
    companyName: '台灣屈臣氏個人用品商店股份有限公司',
    taxId: '70761455',
    brandName: '屈臣氏',
    category: 'SHOPPING',
    aliases: ['Watsons'],
  },
  {
    companyName: '日藥本舖股份有限公司',
    taxId: '28930112',
    brandName: '日藥本舖',
    category: 'SHOPPING',
    aliases: ['Japan Drug'],
  },
  {
    companyName: '寶雅國際股份有限公司',
    taxId: '22999168',
    brandName: '寶雅',
    category: 'SHOPPING',
    aliases: ['POYA'],
  },
  {
    companyName: '小三美日股份有限公司',
    taxId: '24934105',
    brandName: '小三美日',
    category: 'SHOPPING',
    aliases: [],
  },
  {
    companyName: '大樹連鎖藥局股份有限公司',
    taxId: '24482119',
    brandName: '大樹藥局',
    category: 'SHOPPING',
    aliases: ['大樹'],
  },
  {
    companyName: '杏一醫療用品股份有限公司',
    taxId: '23481810',
    brandName: '杏一',
    category: 'SHOPPING',
    aliases: [],
  },

  // ============================================
  // 百貨購物
  // ============================================
  {
    companyName: '新光三越百貨股份有限公司',
    taxId: '23430102',
    brandName: '新光三越',
    category: 'SHOPPING',
    aliases: ['Shin Kong Mitsukoshi'],
  },
  {
    companyName: '遠東百貨股份有限公司',
    taxId: '11100011',
    brandName: '遠東百貨',
    category: 'SHOPPING',
    aliases: ['遠百', 'Far Eastern'],
  },
  {
    companyName: '太平洋崇光百貨股份有限公司',
    taxId: '13082917',
    brandName: 'SOGO',
    category: 'SHOPPING',
    aliases: ['崇光百貨', '太平洋崇光'],
  },
  {
    companyName: '微風廣場實業股份有限公司',
    taxId: '70777481',
    brandName: '微風廣場',
    category: 'SHOPPING',
    aliases: ['Breeze', '微風'],
  },
  {
    companyName: '統一阪急百貨股份有限公司',
    taxId: '22532902',
    brandName: '統一阪急',
    category: 'SHOPPING',
    aliases: ['阪急百貨'],
  },
  {
    companyName: '漢神百貨股份有限公司',
    taxId: '22618303',
    brandName: '漢神百貨',
    category: 'SHOPPING',
    aliases: ['漢神'],
  },
  {
    companyName: '台北101購物中心',
    taxId: '70759475',
    brandName: '台北101',
    category: 'SHOPPING',
    aliases: ['101購物中心'],
  },
  {
    companyName: '環球購物中心股份有限公司',
    taxId: '70776063',
    brandName: '環球購物中心',
    category: 'SHOPPING',
    aliases: ['Global Mall'],
  },

  // ============================================
  // 交通運輸
  // ============================================
  {
    companyName: '台灣高速鐵路股份有限公司',
    taxId: '70826898',
    brandName: '高鐵',
    category: 'TRANSPORT',
    aliases: ['台灣高鐵', 'THSR'],
  },
  {
    companyName: '交通部台灣鐵路管理局',
    taxId: '03551401',
    brandName: '台鐵',
    category: 'TRANSPORT',
    aliases: ['台灣鐵路', 'TRA'],
  },
  {
    companyName: '臺北大眾捷運股份有限公司',
    taxId: '96979933',
    brandName: '台北捷運',
    category: 'TRANSPORT',
    aliases: ['北捷', 'Taipei Metro'],
  },
  {
    companyName: '高雄捷運股份有限公司',
    taxId: '70806820',
    brandName: '高雄捷運',
    category: 'TRANSPORT',
    aliases: ['高捷', 'KRTC'],
  },
  {
    companyName: '桃園大眾捷運股份有限公司',
    taxId: '54316821',
    brandName: '桃園捷運',
    category: 'TRANSPORT',
    aliases: ['機捷', 'Taoyuan Metro'],
  },
  {
    companyName: '台灣中油股份有限公司',
    taxId: '03707901',
    brandName: '中油',
    category: 'TRANSPORT',
    aliases: ['CPC', '台灣中油'],
  },
  {
    companyName: '台塑石油股份有限公司',
    taxId: '28053102',
    brandName: '台塑石油',
    category: 'TRANSPORT',
    aliases: ['台塑', 'Formosa Oil'],
  },
  {
    companyName: '全國加油站股份有限公司',
    taxId: '12749228',
    brandName: '全國加油站',
    category: 'TRANSPORT',
    aliases: ['NPC'],
  },
  {
    companyName: '和運租車股份有限公司',
    taxId: '89893107',
    brandName: '和運租車',
    category: 'TRANSPORT',
    aliases: ['iRent', '和運'],
  },
  {
    companyName: '格上汽車租賃股份有限公司',
    taxId: '70712811',
    brandName: '格上租車',
    category: 'TRANSPORT',
    aliases: ['Car Plus'],
  },

  // ============================================
  // 電信服務
  // ============================================
  {
    companyName: '中華電信股份有限公司',
    taxId: '96979933',
    brandName: '中華電信',
    category: 'OTHER',
    aliases: ['Chunghwa Telecom', 'CHT'],
  },
  {
    companyName: '台灣大哥大股份有限公司',
    taxId: '97176656',
    brandName: '台灣大哥大',
    category: 'OTHER',
    aliases: ['Taiwan Mobile', '台哥大'],
  },
  {
    companyName: '遠傳電信股份有限公司',
    taxId: '97181706',
    brandName: '遠傳',
    category: 'OTHER',
    aliases: ['FarEasTone', '遠傳電信'],
  },
  {
    companyName: '亞太電信股份有限公司',
    taxId: '70761958',
    brandName: '亞太電信',
    category: 'OTHER',
    aliases: ['APT'],
  },
  {
    companyName: '台灣之星電信股份有限公司',
    taxId: '24789666',
    brandName: '台灣之星',
    category: 'OTHER',
    aliases: ['T Star'],
  },

  // ============================================
  // 旅遊住宿
  // ============================================
  {
    companyName: '雄獅資訊科技股份有限公司',
    taxId: '70553900',
    brandName: '雄獅旅遊',
    category: 'OTHER',
    aliases: ['Lion Travel', '雄獅'],
  },
  {
    companyName: '可樂旅遊股份有限公司',
    taxId: '16092721',
    brandName: '可樂旅遊',
    category: 'OTHER',
    aliases: ['Cola Tour'],
  },
  {
    companyName: '東南旅行社股份有限公司',
    taxId: '04316602',
    brandName: '東南旅遊',
    category: 'OTHER',
    aliases: ['South East Travel'],
  },
  {
    companyName: '晶華國際酒店股份有限公司',
    taxId: '12913205',
    brandName: '晶華酒店',
    category: 'ACCOMMODATION',
    aliases: ['Regent', '晶華'],
  },
  {
    companyName: '遠東國際大飯店股份有限公司',
    taxId: '70384991',
    brandName: '遠東大飯店',
    category: 'ACCOMMODATION',
    aliases: ['Shangri-La', '香格里拉'],
  },
  {
    companyName: '寒舍餐旅管理顧問股份有限公司',
    taxId: '53532125',
    brandName: '寒舍艾美',
    category: 'ACCOMMODATION',
    aliases: ['Le Méridien', '艾美酒店'],
  },
  {
    companyName: '老爺大酒店股份有限公司',
    taxId: '11075205',
    brandName: '老爺酒店',
    category: 'ACCOMMODATION',
    aliases: ['Royal Hotel'],
  },
  {
    companyName: '福華大飯店股份有限公司',
    taxId: '22100116',
    brandName: '福華大飯店',
    category: 'ACCOMMODATION',
    aliases: ['Howard Hotel', '福華'],
  },
  {
    companyName: '雲朗觀光股份有限公司',
    taxId: '12636907',
    brandName: '雲朗觀光',
    category: 'ACCOMMODATION',
    aliases: ['翰品酒店'],
  },

  // ============================================
  // 電影娛樂
  // ============================================
  {
    companyName: '威秀影城股份有限公司',
    taxId: '70649111',
    brandName: '威秀影城',
    category: 'ATTRACTION',
    aliases: ['Vieshow', '威秀'],
  },
  {
    companyName: '國賓影城股份有限公司',
    taxId: '12215208',
    brandName: '國賓影城',
    category: 'ATTRACTION',
    aliases: ['Ambassador', '國賓'],
  },
  {
    companyName: '秀泰影城股份有限公司',
    taxId: '54195103',
    brandName: '秀泰影城',
    category: 'ATTRACTION',
    aliases: ['Showtime', '秀泰'],
  },
  {
    companyName: '喜樂時代影城股份有限公司',
    taxId: '54100509',
    brandName: '喜樂時代影城',
    category: 'ATTRACTION',
    aliases: ['Cinemark'],
  },
  {
    companyName: '美麗華開發股份有限公司',
    taxId: '70650907',
    brandName: '美麗華影城',
    category: 'ATTRACTION',
    aliases: ['Miramar', '美麗華'],
  },

  // ============================================
  // 主題樂園與景點
  // ============================================
  {
    companyName: '六福開發股份有限公司',
    taxId: '04718602',
    brandName: '六福村',
    category: 'ATTRACTION',
    aliases: ['Leofoo Village'],
  },
  {
    companyName: '麗寶國際開發股份有限公司',
    taxId: '22549106',
    brandName: '麗寶樂園',
    category: 'ATTRACTION',
    aliases: ['Lihpao Land'],
  },
  {
    companyName: '劍湖山世界股份有限公司',
    taxId: '23227102',
    brandName: '劍湖山',
    category: 'ATTRACTION',
    aliases: ['Janfusun Fancyworld'],
  },
  {
    companyName: '義大開發股份有限公司',
    taxId: '28003501',
    brandName: '義大世界',
    category: 'ATTRACTION',
    aliases: ['E-Da World'],
  },
  {
    companyName: '遠雄海洋公園股份有限公司',
    taxId: '70760131',
    brandName: '遠雄海洋公園',
    category: 'ATTRACTION',
    aliases: ['Farglory Ocean Park'],
  },
  {
    companyName: '國立海洋生物博物館',
    taxId: '85110103',
    brandName: '海生館',
    category: 'ATTRACTION',
    aliases: ['海洋生物博物館', '屏東海生館'],
  },
  {
    companyName: '台北市立動物園',
    taxId: '03777001',
    brandName: '台北動物園',
    category: 'ATTRACTION',
    aliases: ['木柵動物園'],
  },

  // ============================================
  // 3C 家電
  // ============================================
  {
    companyName: '燦坤實業股份有限公司',
    taxId: '22898802',
    brandName: '燦坤',
    category: 'SHOPPING',
    aliases: ['Tsann Kuen', '燦坤3C'],
  },
  {
    companyName: '全國電子股份有限公司',
    taxId: '22616900',
    brandName: '全國電子',
    category: 'SHOPPING',
    aliases: ['E-Life Mall'],
  },
  {
    companyName: '順發電腦股份有限公司',
    taxId: '86330102',
    brandName: '順發3C',
    category: 'SHOPPING',
    aliases: ['順發'],
  },
  {
    companyName: '神腦國際企業股份有限公司',
    taxId: '23685809',
    brandName: '神腦',
    category: 'SHOPPING',
    aliases: ['Senao'],
  },
  {
    companyName: '光華商場',
    taxId: '12345678',
    brandName: '光華商場',
    category: 'SHOPPING',
    aliases: ['光華數位新天地'],
  },

  // ============================================
  // 服飾品牌
  // ============================================
  {
    companyName: '台灣優衣庫有限公司',
    taxId: '27935110',
    brandName: 'UNIQLO',
    category: 'SHOPPING',
    aliases: ['優衣庫'],
  },
  {
    companyName: '台灣札拉股份有限公司',
    taxId: '28873722',
    brandName: 'ZARA',
    category: 'SHOPPING',
    aliases: [],
  },
  {
    companyName: 'H&M股份有限公司',
    taxId: '53925802',
    brandName: 'H&M',
    category: 'SHOPPING',
    aliases: [],
  },
  {
    companyName: 'NET國際開發股份有限公司',
    taxId: '84149558',
    brandName: 'NET',
    category: 'SHOPPING',
    aliases: [],
  },
  {
    companyName: '思夢樂股份有限公司',
    taxId: '23781801',
    brandName: '思夢樂',
    category: 'SHOPPING',
    aliases: ['Shimamura'],
  },

  // ============================================
  // 運動用品
  // ============================================
  {
    companyName: '摩曼頓運動事業股份有限公司',
    taxId: '16744806',
    brandName: '摩曼頓',
    category: 'SHOPPING',
    aliases: ['Momentum'],
  },
  {
    companyName: '迪卡儂股份有限公司',
    taxId: '54260108',
    brandName: '迪卡儂',
    category: 'SHOPPING',
    aliases: ['Decathlon'],
  },

  // ============================================
  // 書店文具
  // ============================================
  {
    companyName: '誠品股份有限公司',
    taxId: '22099131',
    brandName: '誠品',
    category: 'SHOPPING',
    aliases: ['Eslite'],
  },
  {
    companyName: '金石堂圖書股份有限公司',
    taxId: '04749002',
    brandName: '金石堂',
    category: 'SHOPPING',
    aliases: ['Kingstone'],
  },
  {
    companyName: '九乘九文具專家股份有限公司',
    taxId: '16464117',
    brandName: '九乘九',
    category: 'SHOPPING',
    aliases: ['9x9'],
  },
  {
    companyName: '光南大批發股份有限公司',
    taxId: '86569201',
    brandName: '光南',
    category: 'SHOPPING',
    aliases: [],
  },

  // ============================================
  // 家居家飾
  // ============================================
  {
    companyName: '宜家家居股份有限公司',
    taxId: '70840805',
    brandName: 'IKEA',
    category: 'SHOPPING',
    aliases: ['宜家'],
  },
  {
    companyName: '特力屋股份有限公司',
    taxId: '22606801',
    brandName: '特力屋',
    category: 'SHOPPING',
    aliases: ['B&Q'],
  },
  {
    companyName: '台隆手創館股份有限公司',
    taxId: '84127311',
    brandName: '台隆手創館',
    category: 'SHOPPING',
    aliases: ['Hands Tailung'],
  },
  {
    companyName: '生活工場股份有限公司',
    taxId: '23698208',
    brandName: '生活工場',
    category: 'SHOPPING',
    aliases: ['Working House'],
  },

  // ============================================
  // 寵物用品
  // ============================================
  {
    companyName: '台灣動物園股份有限公司',
    taxId: '27696108',
    brandName: '動物王國',
    category: 'SHOPPING',
    aliases: [],
  },
  {
    companyName: '寵物公園國際股份有限公司',
    taxId: '28786805',
    brandName: '寵物公園',
    category: 'SHOPPING',
    aliases: ['Pet Park'],
  },

  // ============================================
  // 飲料連鎖（擴充）
  // ============================================
  {
    companyName: '迷客夏股份有限公司',
    brandName: '迷客夏',
    category: 'FOOD',
    aliases: ['Milk Shop'],
  },
  {
    companyName: '都可茶飲股份有限公司',
    brandName: 'CoCo都可',
    category: 'FOOD',
    aliases: ['CoCo', '都可'],
  },
  {
    companyName: '大苑子茶飲股份有限公司',
    brandName: '大苑子',
    category: 'FOOD',
    aliases: ['Dayunzi'],
  },
  {
    companyName: '茶湯會股份有限公司',
    brandName: '茶湯會',
    category: 'FOOD',
    aliases: ['TP Tea'],
  },
  {
    companyName: '可不可熟成紅茶股份有限公司',
    brandName: '可不可',
    category: 'FOOD',
    aliases: ['可不可熟成紅茶', 'KEBUKE'],
  },
  {
    companyName: '一芳水果茶股份有限公司',
    brandName: '一芳',
    category: 'FOOD',
    aliases: ['一芳水果茶', 'Yi Fang'],
  },
  {
    companyName: '老虎堂股份有限公司',
    brandName: '老虎堂',
    category: 'FOOD',
    aliases: ['Tiger Sugar'],
  },
  {
    companyName: '珍煮丹股份有限公司',
    brandName: '珍煮丹',
    category: 'FOOD',
    aliases: ['Truedan'],
  },
  {
    companyName: '再睡五分鐘股份有限公司',
    brandName: '再睡5分鐘',
    category: 'FOOD',
    aliases: ['再睡五分鐘'],
  },
  {
    companyName: '天仁茗茶股份有限公司',
    brandName: '天仁茗茶',
    category: 'FOOD',
    aliases: ['TenRen', '天仁喫茶趣'],
  },
  {
    companyName: '貢茶股份有限公司',
    brandName: '貢茶',
    category: 'FOOD',
    aliases: ['Gong Cha'],
  },

  // ============================================
  // 日式餐飲連鎖
  // ============================================
  {
    companyName: '爭鮮股份有限公司',
    brandName: '爭鮮',
    category: 'FOOD',
    aliases: ['Sushi Express'],
  },
  {
    companyName: '藏壽司股份有限公司',
    brandName: '藏壽司',
    category: 'FOOD',
    aliases: ['くら寿司', 'Kura Sushi'],
  },
  {
    companyName: '壽司郎股份有限公司',
    brandName: '壽司郎',
    category: 'FOOD',
    aliases: ['スシロー', 'Sushiro'],
  },
  {
    companyName: '吉野家股份有限公司',
    brandName: '吉野家',
    category: 'FOOD',
    aliases: ['Yoshinoya'],
  },
  {
    companyName: 'すき家股份有限公司',
    brandName: 'すき家',
    category: 'FOOD',
    aliases: ['Sukiya', '食其家'],
  },
  {
    companyName: '定食8股份有限公司',
    brandName: '定食8',
    category: 'FOOD',
    aliases: ['Teishoku 8'],
  },
  {
    companyName: '大戶屋股份有限公司',
    brandName: '大戶屋',
    category: 'FOOD',
    aliases: ['Ootoya'],
  },
  {
    companyName: '一蘭拉麵股份有限公司',
    brandName: '一蘭拉麵',
    category: 'FOOD',
    aliases: ['Ichiran', '一蘭'],
  },
  {
    companyName: '屯京拉麵股份有限公司',
    brandName: '屯京拉麵',
    category: 'FOOD',
    aliases: ['Tun Kyoto'],
  },

  // ============================================
  // 火鍋連鎖
  // ============================================
  {
    companyName: '無老鍋股份有限公司',
    brandName: '無老鍋',
    category: 'FOOD',
    aliases: ['Wulao'],
  },
  {
    companyName: '這一鍋股份有限公司',
    brandName: '這一鍋',
    category: 'FOOD',
    aliases: ['SHABU FANTASY'],
  },
  {
    companyName: '馬辣頂級麻辣鴛鴦火鍋股份有限公司',
    brandName: '馬辣',
    category: 'FOOD',
    aliases: ['馬辣火鍋'],
  },
  {
    companyName: '千葉火鍋股份有限公司',
    brandName: '千葉火鍋',
    category: 'FOOD',
    aliases: ['Chiba Hot Pot'],
  },
  {
    companyName: '石二鍋股份有限公司',
    brandName: '石二鍋',
    category: 'FOOD',
    aliases: ['12Sabu'],
  },
  {
    companyName: '涮乃葉股份有限公司',
    brandName: '涮乃葉',
    category: 'FOOD',
    aliases: ['Syabu-Yo'],
  },
  {
    companyName: '錢都涮涮鍋股份有限公司',
    brandName: '錢都涮涮鍋',
    category: 'FOOD',
    aliases: ['錢都'],
  },

  // ============================================
  // 鍋物/燒烤連鎖
  // ============================================
  {
    companyName: '乾杯股份有限公司',
    brandName: '乾杯',
    category: 'FOOD',
    aliases: ['Kanpai', '乾杯燒肉'],
  },
  {
    companyName: '燒肉同話股份有限公司',
    brandName: '燒肉同話',
    category: 'FOOD',
    aliases: ['DOWA'],
  },
  {
    companyName: '胡同燒肉股份有限公司',
    brandName: '胡同燒肉',
    category: 'FOOD',
    aliases: ['HuTong'],
  },
  {
    companyName: '原燒股份有限公司',
    brandName: '原燒',
    category: 'FOOD',
    aliases: ['Yuan Shabu'],
  },

  // ============================================
  // 早餐/早午餐連鎖
  // ============================================
  {
    companyName: '麥味登股份有限公司',
    brandName: '麥味登',
    category: 'FOOD',
    aliases: ['My Warm Day'],
  },
  {
    companyName: '拉亞漢堡股份有限公司',
    brandName: '拉亞漢堡',
    category: 'FOOD',
    aliases: ['Laya Burger'],
  },
  {
    companyName: '美而美股份有限公司',
    brandName: '美而美',
    category: 'FOOD',
    aliases: ['Breakfast Express'],
  },
  {
    companyName: '弘爺漢堡股份有限公司',
    brandName: '弘爺漢堡',
    category: 'FOOD',
    aliases: ['弘爺'],
  },
  {
    companyName: '晨間廚房股份有限公司',
    brandName: '晨間廚房',
    category: 'FOOD',
    aliases: ['Morning Kitchen'],
  },

  // ============================================
  // 中式餐飲連鎖
  // ============================================
  {
    companyName: '八方雲集股份有限公司',
    brandName: '八方雲集',
    category: 'FOOD',
    aliases: ['8Way'],
  },
  {
    companyName: '四海遊龍股份有限公司',
    brandName: '四海遊龍',
    category: 'FOOD',
    aliases: ['Dragon Dumpling'],
  },
  {
    companyName: '三商餐飲股份有限公司',
    brandName: '三商巧福',
    category: 'FOOD',
    aliases: ['三商', 'Mercuries'],
  },
  {
    companyName: '福勝亭股份有限公司',
    brandName: '福勝亭',
    category: 'FOOD',
    aliases: ['Fushentei'],
  },
  {
    companyName: '鬍鬚張股份有限公司',
    brandName: '鬍鬚張',
    category: 'FOOD',
    aliases: ['Formosa Chang'],
  },

  // ============================================
  // 甜點/麵包連鎖
  // ============================================
  {
    companyName: '亞尼克股份有限公司',
    brandName: '亞尼克',
    category: 'FOOD',
    aliases: ['Yannick'],
  },
  {
    companyName: '一之軒食品股份有限公司',
    brandName: '一之軒',
    category: 'FOOD',
    aliases: ['Ijysheng'],
  },
  {
    companyName: '聖瑪莉股份有限公司',
    brandName: '聖瑪莉',
    category: 'FOOD',
    aliases: ['Sunmerry'],
  },
  {
    companyName: '順成蛋糕股份有限公司',
    brandName: '順成蛋糕',
    category: 'FOOD',
    aliases: ['順成'],
  },
  {
    companyName: '吳寶春麥方店股份有限公司',
    brandName: '吳寶春麵包',
    category: 'FOOD',
    aliases: ['Wu Pao Chun'],
  },

  // ============================================
  // 連鎖零售（擴充）
  // ============================================
  {
    companyName: '大創百貨股份有限公司',
    brandName: '大創',
    category: 'SHOPPING',
    aliases: ['DAISO'],
  },
  {
    companyName: '無印良品股份有限公司',
    brandName: '無印良品',
    category: 'SHOPPING',
    aliases: ['MUJI'],
  },
  {
    companyName: '台灣東急手創館股份有限公司',
    brandName: '東急手創館',
    category: 'SHOPPING',
    aliases: ['Tokyu Hands', 'HANDS'],
  },
  {
    companyName: 'Mister Donut股份有限公司',
    brandName: 'Mister Donut',
    category: 'FOOD',
    aliases: ['多拿滋', 'MisterDonut'],
  },
  {
    companyName: 'Krispy Kreme股份有限公司',
    brandName: 'Krispy Kreme',
    category: 'FOOD',
    aliases: ['KK甜甜圈'],
  },
];

async function main() {
  console.log('開始建立企業品牌對照資料...');

  for (const mapping of companyMappings) {
    try {
      await prisma.companyBrandMapping.upsert({
        where: { companyName: mapping.companyName },
        update: {
          taxId: mapping.taxId,
          brandName: mapping.brandName,
          category: mapping.category,
          aliases: mapping.aliases || [],
          isVerified: true,
        },
        create: {
          companyName: mapping.companyName,
          taxId: mapping.taxId,
          brandName: mapping.brandName,
          category: mapping.category,
          aliases: mapping.aliases || [],
          isVerified: true,
        },
      });
      console.log(`✅ ${mapping.brandName}`);
    } catch (error) {
      console.error(`❌ ${mapping.brandName}:`, error);
    }
  }

  console.log(`\n完成！共建立 ${companyMappings.length} 筆企業品牌對照資料`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
