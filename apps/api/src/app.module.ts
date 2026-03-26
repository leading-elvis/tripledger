import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './common/health/health.module';
import { S3Module } from './common/s3/s3.module';
import { FirebaseModule } from './common/firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TripsModule } from './modules/trips/trips.module';
import { BillsModule } from './modules/bills/bills.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { EinvoiceModule } from './modules/einvoice/einvoice.module';
import { ExchangeRateModule } from './modules/exchange-rate/exchange-rate.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate Limiting 設定
    // 預設：每分鐘 60 次請求
    // 短期：每 10 秒 20 次請求（防止爆發式請求）
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 10000, // 10 秒
        limit: 20,
      },
      {
        name: 'default',
        ttl: 60000, // 1 分鐘
        limit: 60,
      },
    ]),
    PrismaModule,
    HealthModule,
    S3Module,
    FirebaseModule,
    AuthModule,
    UsersModule,
    TripsModule,
    BillsModule,
    SettlementModule,
    NotificationsModule,
    PurchaseModule,
    OcrModule,
    EinvoiceModule,
    ExchangeRateModule,
  ],
  providers: [
    // 全域啟用 Rate Limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
