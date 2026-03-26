import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 安全性 HTTP 標頭
  app.use(helmet());

  // 靜態檔案（app-ads.txt 等），從根路徑提供，不受 /api 前綴影響
  app.useStaticAssets(join(__dirname, '..', 'public'));
  const isProduction = process.env.NODE_ENV === 'production';

  // 全域前綴
  app.setGlobalPrefix('api');

  // CORS 設定
  // 生產環境必須設定 CORS_ORIGIN，否則拒絕跨域請求
  const corsOrigin = process.env.CORS_ORIGIN;
  if (isProduction && !corsOrigin) {
    logger.warn('生產環境未設定 CORS_ORIGIN，將拒絕所有跨域請求');
  }
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((o) => o.trim())
      : isProduction
        ? false // 生產環境未設定時拒絕跨域
        : true, // 開發環境允許所有
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 全域驗證管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API 文件（僅在非生產環境啟用）
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('TripLedger API')
      .setDescription('團體旅遊分帳系統 API 文件')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', '認證相關')
      .addTag('users', '用戶管理')
      .addTag('trips', '旅程管理')
      .addTag('bills', '帳單管理')
      .addTag('settlements', '結算管理')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`TripLedger API 啟動於 http://localhost:${port}`);
  if (!isProduction) {
    logger.log(`API 文件位於 http://localhost:${port}/docs`);
  }
}
bootstrap();
