import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const winstonLoggerOptions: winston.LoggerOptions = {
  level: isProduction ? 'info' : 'debug',
  transports: [
    //콘솔 로그
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        isProduction
          ? winston.format.json()
          : nestWinstonModuleUtilities.format.nestLike('rooMy', {
              colors: true,
              prettyPrint: true,
            }),
      ),
    }),
    //파일 로그 - 에러
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    //파일 로그 - 전체
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
};
