import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { BookImportService } from './book-import.service';

/**
 * Open Library Edition Dump Import 실행용 CLI입니다.
 *
 * 사용 예시:
 * pnpm exec ts-node src/book/import/book-edition-import.ts ./data/sample-editions.txt.gz
 */
async function bootstrap() {
  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error(
      'Edition Dump 파일 경로가 필요합니다. 예: ./data/sample-editions.txt.gz',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const bookImportService = app.get(BookImportService);

    await bookImportService.importEditions(filePath);
  } finally {
    await app.close();
  }
}

void bootstrap();
