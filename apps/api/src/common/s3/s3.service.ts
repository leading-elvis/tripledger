import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly region: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'ap-northeast-1');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET', 'tripledger-receipts');

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY', '');

    // 檢查 AWS 憑證是否已設定
    this.isConfigured = !!(accessKeyId && secretAccessKey);

    if (this.isConfigured) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('AWS S3 已設定');
    } else {
      this.logger.warn('AWS S3 未設定，圖片上傳功能將無法使用');
    }
  }

  /**
   * 上傳檔案到 S3
   * @param file Multer 檔案物件
   * @param folder 資料夾路徑 (例如: 'receipts')
   * @returns 檔案的公開 URL，若 S3 未設定則返回 null
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'receipts',
  ): Promise<string | null> {
    if (!this.isConfigured || !this.s3Client) {
      this.logger.warn('AWS S3 未設定，跳過圖片上傳');
      return null;
    }

    const fileExtension = this.getFileExtension(file.originalname);
    const key = `${folder}/${uuidv4()}${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3Client.send(command);
      const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      this.logger.log(`檔案上傳成功: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(`檔案上傳失敗: ${error.message}`);
      throw error;
    }
  }

  /**
   * 從 S3 刪除檔案
   * @param fileUrl 檔案的完整 URL 或 key
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.isConfigured || !this.s3Client) {
      this.logger.warn('AWS S3 未設定，跳過檔案刪除');
      return;
    }

    const key = this.extractKeyFromUrl(fileUrl);
    if (!key) {
      this.logger.warn(`無法從 URL 提取 key: ${fileUrl}`);
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`檔案刪除成功: ${key}`);
    } catch (error) {
      this.logger.error(`檔案刪除失敗: ${error.message}`);
      throw error;
    }
  }

  /**
   * 取得 Signed URL (有時效的存取連結)
   * @param key S3 物件的 key
   * @param expiresIn 有效秒數 (預設 3600 秒 = 1 小時)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
    if (!this.isConfigured || !this.s3Client) {
      this.logger.warn('AWS S3 未設定，無法產生 Signed URL');
      return null;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * 檢查 S3 是否已設定
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * 從 URL 提取 S3 key
   */
  private extractKeyFromUrl(url: string): string | null {
    // 處理完整 URL: https://bucket.s3.region.amazonaws.com/key
    const urlPattern = new RegExp(
      `https://${this.bucket}\\.s3\\.${this.region}\\.amazonaws\\.com/(.+)`,
    );
    const match = url.match(urlPattern);
    if (match) {
      return match[1];
    }

    // 如果已經是 key 格式，直接返回
    if (!url.startsWith('http')) {
      return url;
    }

    return null;
  }

  /**
   * 取得檔案副檔名
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return '';
    }
    return filename.substring(lastDotIndex).toLowerCase();
  }

  /**
   * 檢查是否為允許的圖片類型
   */
  isAllowedImageType(mimetype: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(mimetype);
  }
}
