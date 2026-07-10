import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { WinstonModule } from 'nest-winston';
import { winstonLoggerOptions } from './common/logger/winston.logger';

@Module({
  imports: [WinstonModule.forRoot(winstonLoggerOptions)],
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
