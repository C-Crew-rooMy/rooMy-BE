/**
 * Open Library Dump에서 지원하는 레코드 타입입니다.
 */
export type OpenLibraryDumpType =
  '/type/author' | '/type/work' | '/type/edition';

/**
 * Open Library Dump 한 줄을 정상적으로 파싱한 결과입니다.
 *
 * Dump 원본 형식:
 * type<TAB>key<TAB>revision<TAB>last_modified<TAB>JSON
 */
export interface OpenLibraryDumpRecord<T = unknown> {
  type: OpenLibraryDumpType;
  key: string;
  revision: number;
  lastModified: Date;
  data: T;
}

/**
 * Dump Reader가 한 줄을 정상적으로 읽은 경우입니다.
 */
export interface OpenLibraryDumpReadSuccess {
  success: true;
  record: OpenLibraryDumpRecord;
}

/**
 * Dump Reader가 특정 줄을 파싱하지 못한 경우입니다.
 *
 * 파싱 실패를 예외로 던져 전체 Import를 중단하지 않고,
 * 실패 정보만 ImportService에 전달합니다.
 */
export interface OpenLibraryDumpReadFailure {
  success: false;

  /**
   * Dump 파일에서 오류가 발생한 줄 번호
   */
  lineNumber: number;

  /**
   * 파싱 실패 원인
   */
  error: string;
}

/**
 * Dump Reader가 한 줄을 처리한 결과입니다.
 *
 * success 값을 기준으로
 * 정상 Record 또는 파싱 실패 정보를 구분합니다.
 */
export type OpenLibraryDumpReadResult =
  OpenLibraryDumpReadSuccess | OpenLibraryDumpReadFailure;

/**
 * Open Library Author JSON 데이터 중
 * RooMy에서 사용하는 필드입니다.
 */
export interface OpenLibraryAuthorData {
  /**
   * Open Library Author Key
   *
   * 예: /authors/OL23919A
   */
  key: string;

  /**
   * 저자 이름
   */
  name: string;

  /**
   * Open Library Revision
   */
  revision?: number;

  /**
   * Open Library 데이터의 마지막 수정 시각
   */
  last_modified?: {
    type?: string;
    value?: string;
  };
}

/**
 * Work JSON 내부의 Author 참조 구조입니다.
 */
export interface OpenLibraryWorkAuthorRef {
  author?: {
    key?: string;
  };

  type?: {
    key?: string;
  };
}

/**
 * Open Library Work JSON 데이터 중
 * RooMy에서 사용하는 필드입니다.
 *
 * Work는 특정 판본이 아니라
 * 하나의 작품 자체를 의미합니다.
 */
export interface OpenLibraryWorkData {
  /**
   * Open Library Work Key
   *
   * 예: /works/OL45804W
   */
  key: string;

  /**
   * 작품 제목
   */
  title: string;

  /**
   * 작품 부제목
   */
  subtitle?: string;

  /**
   * 작품 설명
   *
   * Open Library 데이터에 따라
   * 문자열 또는 객체 형태로 제공될 수 있습니다.
   */
  description?:
    | string
    | {
        type?: string;
        value?: string;
      };

  /**
   * 최초 출판일
   *
   * Open Library 원본 문자열을 그대로 저장합니다.
   */
  first_publish_date?: string;

  /**
   * Open Library Covers API에서 사용할 Cover ID 목록
   */
  covers?: number[];

  /**
   * 작품에 참여한 저자 참조 목록
   */
  authors?: OpenLibraryWorkAuthorRef[];

  revision?: number;

  last_modified?: {
    type?: string;
    value?: string;
  };
}

/**
 * Open Library 객체의 Key 참조 구조입니다.
 *
 * Edition → Work,
 * Edition → Language 등에서 사용됩니다.
 */
export interface OpenLibraryKeyRef {
  key?: string;
}

/**
 * Edition JSON 내부의 Author 참조 구조입니다.
 *
 * 현재 RooMy 데이터 모델에서는 Edition-Author 관계를
 * 별도로 저장하지 않지만 원본 데이터 파싱을 위해 정의합니다.
 */
export interface OpenLibraryEditionAuthorRef {
  key?: string;
}

/**
 * Open Library Edition JSON 데이터 중
 * RooMy에서 사용하는 필드입니다.
 *
 * Edition은 ISBN, 출판사, 표지 등
 * 실제 출판된 특정 판본을 의미합니다.
 */
export interface OpenLibraryEditionData {
  /**
   * Open Library Edition Key
   *
   * 예: /books/OL7353617M
   */
  key: string;

  /**
   * 해당 판본의 제목
   */
  title: string;

  /**
   * 해당 판본의 부제목
   */
  subtitle?: string;

  /**
   * 이 Edition이 속한 Work
   */
  works?: OpenLibraryKeyRef[];

  /**
   * Edition에 기록된 Author 정보
   *
   * 현재 DB 관계 생성에는 사용하지 않습니다.
   */
  authors?: OpenLibraryEditionAuthorRef[];

  /**
   * ISBN-10 목록
   */
  isbn_10?: string[];

  /**
   * ISBN-13 목록
   */
  isbn_13?: string[];

  /**
   * 출판사 목록
   */
  publishers?: string[];

  /**
   * 출판일
   *
   * 예:
   * 2017
   * 2017-07
   * 2017-07-11
   */
  publish_date?: string;

  /**
   * 언어 Key 목록
   *
   * 예:
   * /languages/kor
   * /languages/eng
   */
  languages?: OpenLibraryKeyRef[];

  /**
   * Open Library Cover ID 목록
   */
  covers?: number[];

  revision?: number;

  last_modified?: {
    type?: string;
    value?: string;
  };
}
