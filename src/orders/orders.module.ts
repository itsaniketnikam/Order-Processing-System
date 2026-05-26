import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard';
import { AuthModule } from '../auth/auth.module';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersFulfillmentController } from './orders-fulfillment.controller';
import { OrdersController } from './orders.controller';
import { OrdersScheduler } from './orders.scheduler';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    // AuthModule registers PassportModule + JwtStrategy which JwtAuthGuard
    // depends on. Importing it here lets the controller use @UseGuards
    // without re-registering passport in this module.
    AuthModule,
  ],
  controllers: [OrdersController, OrdersFulfillmentController],
  providers: [OrdersService, OrdersScheduler, AdminApiKeyGuard],
  exports: [OrdersService, TypeOrmModule],
})
export class OrdersModule {}
