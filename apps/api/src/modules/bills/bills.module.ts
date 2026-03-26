import { Module } from '@nestjs/common';
import { BillsService } from './bills.service';
import { BillsController } from './bills.controller';
import { TripsModule } from '../trips/trips.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';

@Module({
  imports: [TripsModule, NotificationsModule, ExchangeRateModule],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}
