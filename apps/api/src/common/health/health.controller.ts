import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '健康檢查' })
  @ApiResponse({ status: 200, description: '服務健康' })
  @ApiResponse({ status: 503, description: '服務不健康' })
  async check() {
    try {
      // 檢查資料庫連線
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        version: process.env.npm_package_version || '1.0.0',
      };
    } catch (error) {
      const isProduction = process.env.NODE_ENV === 'production';
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        // 生產環境不暴露錯誤詳情
        ...(isProduction ? {} : { error: error instanceof Error ? error.message : 'Unknown error' }),
      };
    }
  }

  @Get('ready')
  @ApiOperation({ summary: '就緒檢查' })
  @ApiResponse({ status: 200, description: '服務就緒' })
  async readiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: '存活檢查' })
  @ApiResponse({ status: 200, description: '服務存活' })
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
