import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { BookDumpReaderService } from './import/book-dump-reader.service';
import { BookImportService } from './import/book-import.service';

@Module({
  imports: [PrismaModule],
  providers: [BookDumpReaderService, BookImportService],
  exports: [BookDumpReaderService, BookImportService],
})
export class BookModule {}
