import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { BookImportService } from './book-import.service';

/**
 * Open Library Work Dump Import 실행용 CLI입니다.
 *
 * Work 데이터를 BookWork에 저장하고,
 * Work에 포함된 Author 참조를 이용해
 * BookWorkAuthor 관계도 함께 생성합니다.
 *
 * 사용 예시:
 * pnpm exec ts-node src/book/import/book-work-import.ts ./data/sample-works.txt.gz
 */
async function bootstrap() {
  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error(
      'Work Dump 파일 경로가 필요합니다. 예: ./data/sample-works.txt.gz',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const bookImportService = app.get(BookImportService);

    await bookImportService.importWorks(filePath);
  } finally {
    await app.close();
  }
}

void bootstrap();
