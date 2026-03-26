import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LineLoginDto, GoogleLoginDto, RefreshTokenDto, DemoLoginDto, AppleLoginDto } from './dto/auth.dto';
import { RegisterFcmTokenDto, RemoveFcmTokenDto } from './dto/fcm-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 登入端點使用更嚴格的 Rate Limiting
  // 每分鐘最多 5 次，每 10 秒最多 3 次
  @Post('line')
  @Throttle({ short: { ttl: 10000, limit: 3 }, default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LINE 登入' })
  async loginWithLine(@Body() dto: LineLoginDto) {
    return this.authService.loginWithLine(dto.accessToken, {
      name: dto.name,
      avatarUrl: dto.avatarUrl,
    });
  }

  @Post('google')
  @Throttle({ short: { ttl: 10000, limit: 3 }, default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google 登入' })
  async loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto.idToken, {
      name: dto.name,
      avatarUrl: dto.avatarUrl,
    });
  }

  @Post('apple')
  @Throttle({ short: { ttl: 10000, limit: 3 }, default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apple 登入' })
  async loginWithApple(@Body() dto: AppleLoginDto) {
    return this.authService.loginWithApple(dto.appleId, dto.identityToken, {
      email: dto.email,
      name: dto.name,
    });
  }

  @Post('refresh')
  @Throttle({ short: { ttl: 10000, limit: 3 }, default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('demo')
  @Throttle({ short: { ttl: 10000, limit: 3 }, default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demo 登入 (供 Apple 審核使用)' })
  async loginWithDemo(@Body() dto: DemoLoginDto) {
    return this.authService.loginWithDemo(dto.username, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得當前用戶資訊' })
  async getMe(@Request() req: { user: { id: string } }) {
    return req.user;
  }

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '註冊 FCM 裝置 Token' })
  async registerFcmToken(
    @Request() req: { user: { id: string } },
    @Body() dto: RegisterFcmTokenDto,
  ) {
    await this.authService.registerFcmToken(req.user.id, dto.token, dto.platform);
    return { success: true };
  }

  @Delete('fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '移除 FCM 裝置 Token (登出時使用)' })
  async removeFcmToken(
    @Request() req: { user: { id: string } },
    @Body() dto: RemoveFcmTokenDto,
  ) {
    await this.authService.removeFcmToken(req.user.id, dto.token);
    return { success: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登出（撤銷 Refresh Token）' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { success: true, message: '登出成功' };
  }
}
