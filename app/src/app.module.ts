import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ItemsController } from './items/items.controller';
import { ItemsService } from './items/items.service';

@Module({
  controllers: [HealthController, ItemsController],
  providers: [ItemsService],
})
export class AppModule {}
