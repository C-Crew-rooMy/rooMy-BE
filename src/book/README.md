# Archive Book Import

Open Library Data Dump를 RooMy의 Archive Book 데이터로 적재하기 위한 Import 모듈입니다.

Open Library의 Author, Work, Edition 데이터를 순차적으로 가져와
`BookAuthor`, `BookWork`, `BookEdition` 및 관련 관계 테이블에 저장합니다.

---

## 데이터 구조

Open Library 데이터는 다음 구조로 저장됩니다.

```text
BookAuthor
    ↑
BookWorkAuthor
    ↓
BookWork
    ↑
BookEdition
```

- `BookAuthor`: 저자 정보
- `BookWork`: 작품 단위 정보
- `BookEdition`: 실제 출판된 판본 정보
- `BookWorkAuthor`: Work와 Author의 N:M 관계

게시글에서 책을 선택하는 경우에는 `PostBook`이 `BookEdition`을 참조합니다.

```text
Post
  ↓
PostBook
  ↓
BookEdition
  ↓
BookWork
  ↓
BookWorkAuthor
  ↓
BookAuthor
```

---

## Open Library Dump 형식

Open Library Data Dump는 gzip으로 압축된 TSV 형식입니다.

각 레코드는 다음 5개의 컬럼으로 구성됩니다.

```text
type	key	revision	last_modified	JSON
```

예시:

```text
/type/author	/authors/OL1A	1	2026-09-10T00:00:00.000000	{"key":"/authors/OL1A","name":"Example Author"}
```

Import 과정에서는 전체 Dump 파일을 메모리에 올리지 않고 다음 순서로 스트리밍 처리합니다.

```text
.txt.gz
  ↓
createReadStream
  ↓
gunzip
  ↓
readline
  ↓
TSV Parsing
  ↓
JSON Parsing
  ↓
Batch 저장
```

현재 Batch 크기는 `500`건입니다.

---

## Import 순서

Dump Import는 반드시 다음 순서로 실행합니다.

```text
1. Author
2. Work
3. Edition
```

### 1. Author

Author 데이터를 먼저 저장합니다.

```bash
pnpm book:import:authors ./data/ol_dump_authors_latest.txt.gz
```

### 2. Work

Work 데이터를 저장하고 기존 Author와 연결하여 `BookWorkAuthor` 관계를 생성합니다.

```bash
pnpm book:import:works ./data/ol_dump_works_latest.txt.gz
```

### 3. Edition

Edition 데이터를 저장하고 기존 Work와 연결합니다.

```bash
pnpm book:import:editions ./data/ol_dump_editions_latest.txt.gz
```

Work가 존재하지 않는 Edition은 저장하지 않고 실패 건수로 기록합니다.

---

## Revision 처리 정책

Open Library의 `revision`을 기준으로 기존 데이터와 신규 데이터를 비교합니다.

```text
DB에 데이터 없음
→ CREATE

DB revision < incoming revision
→ UPDATE

DB revision = incoming revision
→ SKIP

DB revision > incoming revision
→ SKIP
```

따라서 오래된 Dump를 다시 실행하더라도 최신 데이터가 과거 revision으로 덮어써지지 않습니다.

이 정책은 다음 데이터에 동일하게 적용됩니다.

- Author
- Work
- Edition

---

## Key 검증

Dump TSV의 `key`와 JSON 내부의 `key`가 동일한지 검증합니다.

예를 들어 다음 데이터는 정상입니다.

```text
TSV key  = /works/OL1W
JSON key = /works/OL1W
```

다음과 같이 서로 다른 경우 해당 레코드는 저장하지 않습니다.

```text
TSV key  = /works/OL1W
JSON key = /works/OL999W
```

Key가 일치하지 않는 레코드는 `failed`로 처리하고 다음 레코드 Import를 계속 진행합니다.

---

## 오류 처리

개별 Dump 레코드의 오류 때문에 전체 Import가 중단되지 않도록 처리합니다.

다음과 같은 데이터는 해당 레코드만 건너뜁니다.

- TSV 형식 오류
- JSON Parsing 오류
- 필수 데이터 누락
- TSV key / JSON key 불일치
- Edition이 참조하는 Work 누락

파일 읽기, gzip 스트림, DB 연결 등 Import 자체를 계속할 수 없는 오류가 발생하면 전체 작업을 실패 처리합니다.

---

## 관계 데이터 처리

### Work - Author

Work가 참조하는 Author가 DB에 존재하면 `BookWorkAuthor` 관계를 생성합니다.

Author가 존재하지 않는 경우:

```text
Work 저장
Author 관계 생성 SKIP
Warning 로그 기록
```

Work 자체는 유효한 데이터이므로 Import 실패로 처리하지 않습니다.

### Edition - Work

Edition이 참조하는 Work가 존재하지 않는 경우:

```text
Edition 저장 SKIP
failed + 1
Warning 로그 기록
```

Edition은 Work 없이 저장할 수 없기 때문에 실패 건수에 포함합니다.

---

## 중복 처리

신규 데이터는 `createMany()`와 `skipDuplicates`를 사용하여 Batch Insert합니다.

이미 존재하는 데이터는 `openLibraryKey`와 `revision`을 비교합니다.

Work-Author 관계 역시 중복 생성되지 않도록 처리합니다.

따라서 동일한 Dump를 다시 실행해도 동일 레코드나 관계가 중복 생성되지 않습니다.

---

## BookSyncLog

각 Import 실행 결과는 `BookSyncLog`에 기록합니다.

주요 기록 정보:

```text
syncType
target
status
processed
created
updated
failed
startedAt
finishedAt
errorMessage
```

현재 Dump Import는 `FULL` 타입으로 기록합니다.

대상은 Import 종류에 따라 다음과 같이 구분됩니다.

```text
AUTHOR
WORK
EDITION
```

Import 실행 중에는 `RUNNING`, 정상 종료 시 `SUCCESS`, Import 자체를 계속할 수 없는 오류가 발생하면 `FAILED` 상태로 기록합니다.

---

## 실행 예시

```bash
pnpm book:import:authors ./data/ol_dump_authors_latest.txt.gz

pnpm book:import:works ./data/ol_dump_works_latest.txt.gz

pnpm book:import:editions ./data/ol_dump_editions_latest.txt.gz
```

Dump 파일은 프로젝트의 `data/` 디렉터리에 저장합니다.

`data/` 디렉터리는 `.gitignore`에 등록되어 있으므로 실제 Dump 파일은 Git에 포함하지 않습니다.

---

## 참고

현재 Import 모듈은 Open Library 전체 Dump를 기반으로 Archive Book 초기 데이터를 구축하기 위한 용도입니다.

검색 API와 주기적인 Incremental Sync는 별도 기능으로 구현합니다.