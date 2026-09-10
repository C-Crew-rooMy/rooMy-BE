import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import * as readline from 'readline';

import { Injectable } from '@nestjs/common';

import { parseOpenLibraryDumpLine } from './book-dump-parser';
import type { OpenLibraryDumpReadResult } from './book-import.types';

@Injectable()
export class BookDumpReaderService {
  /**
   * Open Library .txt.gz Dump 파일을 스트리밍 방식으로 읽습니다.
   *
   * 전체 Dump 파일을 메모리에 올리지 않고
   * gzip 압축 해제 → line 단위 읽기 → TSV/JSON 파싱 순서로 처리합니다.
   *
   * 특정 줄의 파싱이 실패하더라도
   * 전체 Dump 처리를 중단하지 않고 실패 결과를 반환한 뒤
   * 다음 줄을 계속 처리합니다.
   */
  async *read(filePath: string): AsyncGenerator<OpenLibraryDumpReadResult> {
    const fileStream = createReadStream(filePath);
    const gunzipStream = createGunzip();
    const input = fileStream.pipe(gunzipStream);

    const rl = readline.createInterface({
      input,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;

    try {
      for await (const line of rl) {
        lineNumber += 1;

        /**
         * 빈 줄은 Import 대상에서 제외합니다.
         */
        if (!line.trim()) {
          continue;
        }

        try {
          const record = parseOpenLibraryDumpLine(line);

          yield {
            success: true,
            record,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : '알 수 없는 오류';

          /**
           * 한 줄의 파싱 오류 때문에
           * 전체 Dump Import를 중단하지 않습니다.
           *
           * 실패 정보를 ImportService에 전달하여
           * BookSyncLog.failed에 집계할 수 있도록 합니다.
           */
          yield {
            success: false,
            lineNumber,
            error: message,
          };
        }
      }
    } finally {
      rl.close();
    }
  }
}
