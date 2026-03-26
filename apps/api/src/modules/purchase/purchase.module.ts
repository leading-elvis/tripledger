import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { AppleVerificationService } from './services/apple-verification.service';
import { GoogleVerificationService } from './services/google-verification.service';

@Module({
  imports: [ConfigModule],
  controllers: [PurchaseController],
  providers: [
    PurchaseService,
    AppleVerificationService,
    GoogleVerificationService,
  ],
  exports: [PurchaseService],
})
export class PurchaseModule {}
