import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { envValidationSchema } from './config/env.validation';
import { typeOrmAsyncConfig } from './database/typeorm.factory';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    // ScheduleModule must be initialized at app root so SchedulerRegistry
    // is available to feature modules that register dynamic cron jobs.
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    UsersModule,
    AuthModule,
    OrdersModule,
  ],
})
export class AppModule {}
