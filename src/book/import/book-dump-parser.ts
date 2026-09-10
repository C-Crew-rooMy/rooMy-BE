import type {
  OpenLibraryDumpRecord,
  OpenLibraryDumpType,
} from './book-import.types';

/**
 * Open Library Dump의 TSV 한 줄을 파싱합니다.
 *
 * 원본 형식:
 * type \t key \t revision \t last_modified \t JSON
 *
 * @returns 파싱된 Dump Record
 * @throws TSV 형식이 잘못되었거나 JSON 파싱에 실패한 경우 Error
 */
export function parseOpenLibraryDumpLine(line: string): OpenLibraryDumpRecord {
  const columns = line.split('\t');

  if (columns.length !== 5) {
    throw new Error(
      `Open Library Dump 형식이 올바르지 않습니다. columns=${columns.length}`,
    );
  }

  const [type, key, revisionRaw, lastModifiedRaw, jsonRaw] = columns;

  if (!isOpenLibraryDumpType(type)) {
    throw new Error(`지원하지 않는 Open Library Dump 타입입니다: ${type}`);
  }

  if (!key) {
    throw new Error('Open Library Dump key가 없습니다.');
  }

  const revision = Number(revisionRaw);

  if (!Number.isInteger(revision)) {
    throw new Error(`revision 값이 올바르지 않습니다: ${revisionRaw}`);
  }

  const lastModified = new Date(lastModifiedRaw);

  if (Number.isNaN(lastModified.getTime())) {
    throw new Error(`last_modified 값이 올바르지 않습니다: ${lastModifiedRaw}`);
  }

  let data: unknown;

  try {
    data = JSON.parse(jsonRaw);
  } catch {
    throw new Error(`Open Library Dump JSON 파싱에 실패했습니다. key=${key}`);
  }

  return {
    type,
    key,
    revision,
    lastModified,
    data,
  };
}

/**
 * RooMy Archive Book Import에서 처리할 수 있는
 * Open Library Dump 타입인지 확인합니다.
 */
function isOpenLibraryDumpType(type: string): type is OpenLibraryDumpType {
  return (
    type === '/type/author' || type === '/type/work' || type === '/type/edition'
  );
}
