import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';

/**
 * 邊界框
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 文字區塊（含位置資訊）
 */
export interface VisionTextBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

/**
 * 結構化區域（依收據版面分區）
 */
export interface StructuredRegions {
  /** 上方 20%：店名、統編、地址 */
  header: string[];
  /** 中間 60%：明細項目 */
  body: string[];
  /** 下方 20%：總計、發票號碼 */
  footer: string[];
}

/**
 * Vision OCR 辨識結果
 */
export interface VisionOcrResult {
  /** 完整辨識文字 */
  fullText: string;
  /** 文字區塊列表（舊格式，向下相容） */
  blocks: Array<{
    text: string;
    confidence: number;
  }>;
  /** 文字區塊列表（含位置資訊） */
  textBlocks: VisionTextBlock[];
  /** 結構化區域 */
  structuredRegions: StructuredRegions;
  /** 偵測到的語言 */
  detectedLanguage?: string;
}

/**
 * Google Cloud Vision OCR 服務
 *
 * 使用 Google Cloud Vision API 進行圖片文字辨識，
 * 對中文（特別是台灣繁體中文）的辨識效果優於本地 ML Kit。
 *
 * 配置方式（二選一）：
 * 1. API Key: 設定 GOOGLE_CLOUD_VISION_API_KEY 環境變數
 * 2. 服務帳號: 設定 GOOGLE_APPLICATION_CREDENTIALS 環境變數指向 JSON 檔案
 *    或在 Cloud Run 上使用 Workload Identity
 */
@Injectable()
export class VisionOcrService implements OnModuleInit {
  private readonly logger = new Logger(VisionOcrService.name);
  private client: ImageAnnotatorClient | null = null;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeClient();
  }

  /**
   * 初始化 Vision API 客戶端
   */
  private async initializeClient(): Promise<void> {
    try {
      // 檢查是否有設定 API Key 或服務帳號
      const apiKey = this.configService.get<string>('GOOGLE_CLOUD_VISION_API_KEY');
      const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
      const privateKey = this.configService.get<string>('GOOGLE_CLOUD_PRIVATE_KEY');
      const clientEmail = this.configService.get<string>('GOOGLE_CLOUD_CLIENT_EMAIL');

      // 方式 1: 使用服務帳號憑證
      if (projectId && privateKey && clientEmail) {
        this.client = new ImageAnnotatorClient({
          projectId,
          credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
          },
        });
        this.isConfigured = true;
        this.logger.log('Google Cloud Vision API 已設定（服務帳號）');
        return;
      }

      // 方式 2: 使用 API Key
      if (apiKey) {
        this.client = new ImageAnnotatorClient({
          apiKey,
        });
        this.isConfigured = true;
        this.logger.log('Google Cloud Vision API 已設定（API Key）');
        return;
      }

      // 方式 3: 使用預設憑證（Cloud Run Workload Identity 或 GOOGLE_APPLICATION_CREDENTIALS）
      try {
        this.client = new ImageAnnotatorClient();
        // 嘗試一個簡單的操作來驗證憑證
        this.isConfigured = true;
        this.logger.log('Google Cloud Vision API 已設定（預設憑證）');
      } catch {
        this.logger.warn('Google Cloud Vision API 未設定，圖片 OCR 功能將無法使用');
      }
    } catch (error) {
      this.logger.error(`初始化 Vision API 失敗: ${error}`);
      this.isConfigured = false;
    }
  }

  /**
   * 檢查服務是否可用
   */
  isEnabled(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * 從圖片 Buffer 辨識文字
   *
   * @param imageBuffer - 圖片的 Buffer
   * @returns OCR 辨識結果
   */
  async recognizeFromBuffer(imageBuffer: Buffer): Promise<VisionOcrResult> {
    if (!this.isEnabled()) {
      throw new Error('Google Cloud Vision API 未設定');
    }

    try {
      this.logger.debug('開始 Vision API OCR 辨識...');

      // 呼叫 Document Text Detection（對收據等文件效果較好）
      const [result] = await this.client!.documentTextDetection({
        image: {
          content: imageBuffer,
        },
        imageContext: {
          // 多語言支援：繁體中文、日文、韓文、泰文、越南文、英文
          languageHints: ['zh-Hant', 'zh-TW', 'ja', 'ko', 'th', 'vi', 'en'],
        },
      });

      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation?.text) {
        this.logger.warn('Vision API 未辨識到任何文字');
        return {
          fullText: '',
          blocks: [],
          textBlocks: [],
          structuredRegions: { header: [], body: [], footer: [] },
        };
      }

      // 提取文字區塊（含位置資訊）
      const blocks: Array<{ text: string; confidence: number }> = [];
      const textBlocks: VisionTextBlock[] = [];

      if (fullTextAnnotation.pages) {
        for (const page of fullTextAnnotation.pages) {
          if (page.blocks) {
            for (const block of page.blocks) {
              let blockText = '';
              let totalConfidence = 0;
              let symbolCount = 0;

              if (block.paragraphs) {
                for (const paragraph of block.paragraphs) {
                  if (paragraph.words) {
                    for (const word of paragraph.words) {
                      if (word.symbols) {
                        for (const symbol of word.symbols) {
                          blockText += symbol.text || '';
                          totalConfidence += symbol.confidence || 0;
                          symbolCount++;
                        }
                      }
                    }
                  }
                }
              }

              if (blockText.trim()) {
                // 舊格式（向下相容）
                blocks.push({
                  text: blockText.trim(),
                  confidence: symbolCount > 0 ? totalConfidence / symbolCount : 0,
                });

                // 新格式（含位置資訊）
                const boundingBox = this.extractBoundingBox(block.boundingBox);
                textBlocks.push({
                  text: blockText.trim(),
                  confidence: symbolCount > 0 ? totalConfidence / symbolCount : 0,
                  boundingBox,
                });
              }
            }
          }
        }
      }

      // 計算結構化區域
      const structuredRegions = this.analyzeLayout(textBlocks);

      // 偵測語言
      let detectedLanguage: string | undefined;
      if (fullTextAnnotation.pages?.[0]?.property?.detectedLanguages?.[0]) {
        detectedLanguage = fullTextAnnotation.pages[0].property.detectedLanguages[0].languageCode ?? undefined;
      }

      const fullText = fullTextAnnotation.text;
      this.logger.debug(`Vision API 辨識完成，文字長度: ${fullText.length}，區塊數: ${blocks.length}`);

      return {
        fullText,
        blocks,
        textBlocks,
        structuredRegions,
        detectedLanguage,
      };
    } catch (error) {
      this.logger.error(`Vision API OCR 辨識失敗: ${error}`);
      throw error;
    }
  }

  /**
   * 從 Base64 編碼的圖片辨識文字
   *
   * @param base64Image - Base64 編碼的圖片（不含 data URI 前綴）
   * @returns OCR 辨識結果
   */
  async recognizeFromBase64(base64Image: string): Promise<VisionOcrResult> {
    // 移除可能的 data URI 前綴
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    return this.recognizeFromBuffer(imageBuffer);
  }

  /**
   * 從 Google Vision API 的 BoundingPoly 提取邊界框
   */
  private extractBoundingBox(boundingPoly: any): BoundingBox {
    if (!boundingPoly?.vertices || boundingPoly.vertices.length < 4) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const vertices = boundingPoly.vertices;
    const xs = vertices.map((v: any) => v.x || 0);
    const ys = vertices.map((v: any) => v.y || 0);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * 分析版面結構，將文字區塊分為 header/body/footer
   *
   * 收據通常結構如下：
   * - Header (上方 20%): 店名、統編、地址、電話
   * - Body (中間 60%): 明細項目、單價、數量
   * - Footer (下方 20%): 總計、發票號碼、時間
   */
  private analyzeLayout(textBlocks: VisionTextBlock[]): StructuredRegions {
    if (textBlocks.length === 0) {
      return { header: [], body: [], footer: [] };
    }

    // 依 Y 座標排序
    const sortedBlocks = [...textBlocks].sort((a, b) => a.boundingBox.y - b.boundingBox.y);

    // 計算總高度範圍
    const minY = sortedBlocks[0].boundingBox.y;
    const maxY = Math.max(
      ...sortedBlocks.map(b => b.boundingBox.y + b.boundingBox.height),
    );
    const totalHeight = maxY - minY;

    if (totalHeight <= 0) {
      // 無法計算區域，全部放入 body
      return {
        header: [],
        body: sortedBlocks.map(b => b.text),
        footer: [],
      };
    }

    // 定義區域邊界（可調整）
    const headerThreshold = minY + totalHeight * 0.20; // 上方 20%
    const footerThreshold = minY + totalHeight * 0.80; // 下方 20%

    const header: string[] = [];
    const body: string[] = [];
    const footer: string[] = [];

    for (const block of sortedBlocks) {
      const blockMiddleY = block.boundingBox.y + block.boundingBox.height / 2;

      if (blockMiddleY <= headerThreshold) {
        header.push(block.text);
      } else if (blockMiddleY >= footerThreshold) {
        footer.push(block.text);
      } else {
        body.push(block.text);
      }
    }

    this.logger.debug(
      `版面分析: header=${header.length}塊, body=${body.length}塊, footer=${footer.length}塊`,
    );

    return { header, body, footer };
  }
}
