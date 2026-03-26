import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum DevicePlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'FCM 裝置 Token',
    example: 'fcm_token_string...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: '裝置平台',
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}

export class RemoveFcmTokenDto {
  @ApiProperty({
    description: 'FCM 裝置 Token',
    example: 'fcm_token_string...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
