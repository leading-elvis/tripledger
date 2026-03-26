import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * 解析電子發票 QR Code 請求 DTO
 */
export class ParseQrDto {
  /**
   * QR Code 原始資料
   * @example "AB123456781150129abcd00000158000001580000000022555003..."
   */
  @IsString()
  @IsNotEmpty({ message: 'QR Code 資料不能為空' })
  @MinLength(53, { message: 'QR Code 資料長度不足' })
  qrData: string;
}
