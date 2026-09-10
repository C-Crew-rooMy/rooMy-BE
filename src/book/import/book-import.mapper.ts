import type {
  OpenLibraryAuthorData,
  OpenLibraryEditionData,
  OpenLibraryWorkData,
} from './book-import.types';

/**
 * Open Library Author 데이터를
 * RooMy BookAuthor 저장 형태로 변환합니다.
 */
export function mapAuthorData(
  data: OpenLibraryAuthorData,
  revision: number,
  lastModified: Date,
) {
  return {
    openLibraryKey: data.key,
    revision,
    sourceModifiedAt: lastModified,
    name: data.name,
    syncedAt: new Date(),
  };
}

/**
 * Open Library Work 데이터를
 * RooMy BookWork 저장 형태로 변환합니다.
 */
export function mapWorkData(
  data: OpenLibraryWorkData,
  revision: number,
  lastModified: Date,
) {
  return {
    openLibraryKey: data.key,
    revision,
    sourceModifiedAt: lastModified,
    title: data.title,
    subtitle: data.subtitle ?? null,
    description: normalizeDescription(data.description),
    firstPublishDate: data.first_publish_date ?? null,
    coverIds: data.covers ?? [],
    syncedAt: new Date(),
  };
}

/**
 * Open Library Edition 데이터를
 * RooMy BookEdition 저장 형태로 변환합니다.
 *
 * workId는 Open Library의 Work Key를 이용해
 * 실제 BookWork를 조회한 뒤 별도로 설정합니다.
 */
export function mapEditionData(
  data: OpenLibraryEditionData,
  revision: number,
  lastModified: Date,
  workId: bigint,
) {
  return {
    workId,
    openLibraryKey: data.key,
    revision,
    sourceModifiedAt: lastModified,
    title: data.title,
    subtitle: data.subtitle ?? null,
    isbn10: data.isbn_10 ?? [],
    isbn13: data.isbn_13 ?? [],
    publishers: data.publishers ?? [],
    publishDate: data.publish_date ?? null,
    languages:
      data.languages
        ?.map((language) => language.key)
        .filter((key): key is string => Boolean(key)) ?? [],
    coverIds: data.covers ?? [],
    syncedAt: new Date(),
  };
}

/**
 * Open Library Work의 description 값을
 * DB 저장용 문자열로 정규화합니다.
 *
 * description은 문자열 또는
 * { type, value } 형태로 제공될 수 있습니다.
 */
function normalizeDescription(
  description: OpenLibraryWorkData['description'],
): string | null {
  if (!description) {
    return null;
  }

  if (typeof description === 'string') {
    return description;
  }

  return description.value ?? null;
}
