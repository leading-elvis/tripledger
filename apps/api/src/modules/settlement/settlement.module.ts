import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementController } from './settlement.controller';
import { TripsModule } from '../trips/trips.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TripsModule, NotificationsModule],
  controllers: [SettlementController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
