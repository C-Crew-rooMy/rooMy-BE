import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { BookImportService } from './book-import.service';

/**
 * Open Library Dump Reader / Parser 동작 확인용 CLI입니다.
 *
 * 사용 예시:
 * pnpm exec ts-node src/book/import/book-dump-preview.ts ./data/sample.txt.gz
 */
async function bootstrap() {
  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error(
      'Dump 파일 경로가 필요합니다. 예: ./data/ol_dump_works.txt.gz',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const bookImportService = app.get(BookImportService);

    await bookImportService.previewDump(filePath, 10);
  } finally {
    await app.close();
  }
}

void bootstrap();
