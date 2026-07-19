import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { WinstonModule } from 'nest-winston';
import { winstonLoggerOptions } from './common/logger/winston.logger';
import { S3Module } from './common/s3/s3.module';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WinstonModule.forRoot(winstonLoggerOptions),
    PrismaModule,
    S3Module,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
