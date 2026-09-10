import { Injectable, Logger } from '@nestjs/common';
import { BookSyncStatus, BookSyncTarget, BookSyncType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { BookDumpReaderService } from './book-dump-reader.service';
import {
  mapAuthorData,
  mapEditionData,
  mapWorkData,
} from './book-import.mapper';
import type {
  OpenLibraryAuthorData,
  OpenLibraryEditionData,
  OpenLibraryWorkData,
} from './book-import.types';

@Injectable()
export class BookImportService {
  private readonly logger = new Logger(BookImportService.name);

  /**
   * Open Library Dump 데이터를 DB에 저장할 때 사용하는 Batch 크기입니다.
   *
   * 대용량 Dump 전체를 메모리에 올리지 않고
   * 일정 단위로 나누어 처리합니다.
   */
  private readonly batchSize = 500;

  constructor(
    private readonly bookDumpReaderService: BookDumpReaderService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Open Library Dump 파일을 읽어 샘플 레코드를 확인합니다.
   *
   * DB에는 저장하지 않고,
   * Reader / Parser가 정상적으로 동작하는지 검증하기 위한 용도입니다.
   *
   * @param filePath .txt.gz Dump 파일 경로
   * @param limit 확인할 최대 정상 레코드 수
   */
  async previewDump(filePath: string, limit = 10): Promise<void> {
    let count = 0;

    for await (const result of this.bookDumpReaderService.read(filePath)) {
      if (!result.success) {
        this.logger.warn(
          `Dump 파싱 실패: line=${result.lineNumber}, ${result.error}`,
        );

        continue;
      }

      const record = result.record;

      this.logger.log(
        `[${count + 1}] type=${record.type}, key=${record.key}, revision=${record.revision}`,
      );

      count += 1;

      if (count >= limit) {
        break;
      }
    }

    this.logger.log(`Dump 미리보기 완료: ${count}건`);
  }

  /**
   * Open Library Author Dump를 BookAuthor 테이블에 적재합니다.
   *
   * 신규 Author는 생성하고,
   * 기존 Author는 incoming revision이 더 높은 경우에만 갱신합니다.
   *
   * 동일하거나 더 낮은 revision은 기존 데이터를 유지합니다.
   *
   * @param filePath Open Library Author Dump 파일 경로
   */
  async importAuthors(filePath: string): Promise<void> {
    const syncLog = await this.prisma.bookSyncLog.create({
      data: {
        syncType: BookSyncType.FULL,
        target: BookSyncTarget.AUTHOR,
        status: BookSyncStatus.RUNNING,
      },
    });

    let processed = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;

    let batch: ReturnType<typeof mapAuthorData>[] = [];

    try {
      for await (const result of this.bookDumpReaderService.read(filePath)) {
        if (!result.success) {
          failed += 1;

          this.logger.warn(
            `Author Dump 파싱 실패: line=${result.lineNumber}, ${result.error}`,
          );

          continue;
        }

        const record = result.record;

        if (record.type !== '/type/author') {
          continue;
        }

        try {
          const data = record.data as OpenLibraryAuthorData;

          if (!data.key || !data.name) {
            failed += 1;
            continue;
          }

          if (!this.isSameOpenLibraryKey(record.key, data.key)) {
            failed += 1;

            this.logger.warn(
              `Author Key 불일치로 건너뜁니다: recordKey=${record.key}, dataKey=${data.key}`,
            );

            continue;
          }

          batch.push(mapAuthorData(data, record.revision, record.lastModified));

          processed += 1;

          if (batch.length >= this.batchSize) {
            const batchResult = await this.saveAuthorBatch(batch);

            created += batchResult.created;
            updated += batchResult.updated;

            batch = [];
          }
        } catch (error) {
          failed += 1;

          this.logger.warn(
            `Author 변환 실패: key=${record.key}, ${
              error instanceof Error ? error.message : '알 수 없는 오류'
            }`,
          );
        }
      }

      if (batch.length > 0) {
        const batchResult = await this.saveAuthorBatch(batch);

        created += batchResult.created;
        updated += batchResult.updated;
      }

      await this.prisma.bookSyncLog.update({
        where: {
          id: syncLog.id,
        },
        data: {
          status: BookSyncStatus.SUCCESS,
          processed,
          created,
          updated,
          failed,
          finishedAt: new Date(),
        },
      });

      this.logger.log(
        `Author Import 완료: processed=${processed}, created=${created}, updated=${updated}, failed=${failed}`,
      );
    } catch (error) {
      await this.prisma.bookSyncLog.update({
        where: {
          id: syncLog.id,
        },
        data: {
          status: BookSyncStatus.FAILED,
          processed,
          created,
          updated,
          failed,
          finishedAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : '알 수 없는 오류',
        },
      });

      throw error;
    }
  }

  /**
   * Open Library Work Dump를 BookWork 테이블에 적재하고,
   * Work와 Author의 관계를 BookWorkAuthor 테이블에 저장합니다.
   *
   * 기존 Work가 존재하는 경우 incoming revision과 비교하여
   * 더 높은 revision의 데이터만 갱신합니다.
   *
   * @param filePath Open Library Work Dump 파일 경로
   */
  async importWorks(filePath: string): Promise<void> {
    const syncLog = await this.prisma.bookSyncLog.create({
      data: {
        syncType: BookSyncType.FULL,
        target: BookSyncTarget.WORK,
        status: BookSyncStatus.RUNNING,
      },
    });

    let processed = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;

    let batch: {
      work: ReturnType<typeof mapWorkData>;
      authorKeys: string[];
    }[] = [];

    try {
      for await (const result of this.bookDumpReaderService.read(filePath)) {
        if (!result.success) {
          failed += 1;

          this.logger.warn(
            `Work Dump 파싱 실패: line=${result.lineNumber}, ${result.error}`,
          );

          continue;
        }

        const record = result.record;

        if (record.type !== '/type/work') {
          continue;
        }

        try {
          const data = record.data as OpenLibraryWorkData;

          if (!data.key || !data.title) {
            failed += 1;
            continue;
          }

          if (!this.isSameOpenLibraryKey(record.key, data.key)) {
            failed += 1;

            this.logger.warn(
              `Work Key 불일치로 건너뜁니다: recordKey=${record.key}, dataKey=${data.key}`,
            );

            continue;
          }

          const authorKeys =
            data.authors
              ?.map((authorRef) => authorRef.author?.key)
              .filter((key): key is string => Boolean(key)) ?? [];

          batch.push({
            work: mapWorkData(data, record.revision, record.lastModified),
            authorKeys,
          });

          processed += 1;

          if (batch.length >= this.batchSize) {
            const batchResult = await this.saveWorkBatch(batch);

            created += batchResult.created;
            updated += batchResult.updated;

            batch = [];
          }
        } catch (error) {
          failed += 1;

          this.logger.warn(
            `Work 변환 실패: key=${record.key}, ${
              error instanceof Error ? error.message : '알 수 없는 오류'
            }`,
          );
        }
      }

      if (batch.length > 0) {
        const batchResult = await this.saveWorkBatch(batch);

        created += batchResult.created;
        updated += batchResult.updated;
      }

      await this.prisma.bookSyncLog.update({
        where: {
          id: syncLog.id,
        },
        data: {
          status: BookSyncStatus.SUCCESS,
          processed,
          created,
          updated,
          failed,
          finishedAt: new Date(),
        },
      });

      this.logger.log(
        `Work Import 완료: processed=${processed}, created=${created}, updated=${updated}, failed=${failed}`,
      );
    } catch (error) {
      await this.prisma.bookSyncLog.update({
        where: {
          id: syncLog.id,
        },
        data: {
          status: BookSyncStatus.FAILED,
          processed,
          created,
          updated,
          failed,
          finishedAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : '알 수 없는 오류',
        },
      });

      throw error;
    }
  }

  /**
   * Open Library Edition Dump를 BookEdition 테이블에 적재합니다.
   *
   * Edition 데이터의 works[0].key를 기준으로
   * 기존 BookWork를 조회한 뒤 내부 workId를 연결합니다.
   *
   * 신규 Edition은 생성하고,
   * 기존 Edition은 incoming revision이 더 높은 경우에만 갱신합니다.
   *
   * 참조할 Work가 존재하지 않는 Edition은
   * 전체 Import를 중단하지 않고 해당 데이터만 건너뜁니다.
   *
   * @param filePath Open Library Edition Dump 파일 경로
   */
  async importEditions(filePath: string): Promise<void> {
    const syncLog = await this.prisma.bookSyncLog.create({
      data: {
        syncType: BookSyncType.FULL,
        target: BookSyncTarget.EDITION,
        status: BookSyncStatus.RUNNING,
      },
    });

    let processed = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;

    let batch: {
      data: OpenLibraryEditionData;
      revision: number;
      lastModified: Date;
      workKey: string;
    }[] = [];

    try {
      for await (const result of this.bookDumpReaderService.read(filePath)) {
        if (!result.success) {
          failed += 1;

          this.logger.warn(
            `Edition Dump 파싱 실패: line=${result.lineNumber}, ${result.error}`,
          );

          continue;
        }

        const record = result.record;

        if (record.type !== '/type/edition') {
          continue;
        }

        try {
          const data = record.data as OpenLibraryEditionData;

          if (!data.key || !data.title) {
            failed += 1;
            continue;
          }

          if (!this.isSameOpenLibraryKey(record.key, data.key)) {
            failed += 1;

            this.logger.warn(
              `Edition Key 불일치로 건너뜁니다: recordKey=${record.key}, dataKey=${data.key}`,
            );

            continue;
          }

          /**
           * Open Library Edition은 하나의 Work를 참조하므로
           * works 배열의 첫 번째 Key를 사용합니다.
           */
          const workKey = data.works?.[0]?.key;

          if (!workKey) {
            failed += 1;

            this.logger.warn(
              `Work 참조가 없는 Edition을 건너뜁니다: edition=${data.key}`,
            );

            continue;
          }

          batch.push({
            data,
            revision: record.revision,
            lastModified: record.lastModified,
            workKey,
          });

          processed += 1;

          if (batch.length >= this.batchSize) {
            const batchResult = await this.saveEditionBatch(batch);

            created += batchResult.created;
            updated += batchResult.updated;
            failed += batchResult.failed;

            batch = [];
          }
        } catch (error) {
          failed += 1;

          this.logger.warn(
            `Edition 변환 실패: key=${record.key}, ${
              error instanceof Error ? error.message : '알 수 없는 오류'
            }`,
          );
        }
      }

      if (batch.length > 0) {
        const batchResult = await this.saveEditionBatch(batch);

        created += batchResult.created;
        updated += batchResult.updated;
        failed += batchResult.failed;
      }

      await this.prisma.bookSyncLog.update({
        where: {
          id: syncLog.id,
        },
        data: {
          status: BookSyncStatus.SUCCESS,
          processed,
          created,
          updated,
          failed,
          finishedAt: new Date(),
        },
      });

      this.logger.log(
        `Edition Import 완료: processed=${processed}, created=${created}, updated=${updated}, failed=${failed}`,
      );
    } catch (error) {
      await this.prisma.bookSyncLog.update({
        where: {
          id: syncLog.id,
        },
        data: {
          status: BookSyncStatus.FAILED,
          processed,
          created,
          updated,
          failed,
          finishedAt: new Date(),
          errorMessage:
            error instanceof Error ? error.message : '알 수 없는 오류',
        },
      });

      throw error;
    }
  }

  /**
   * Author 데이터를 저장합니다.
   *
   * 신규 Author는 createMany로 저장하고,
   * 기존 Author는 incoming revision이 더 높은 경우에만 갱신합니다.
   */
  private async saveAuthorBatch(
    batch: ReturnType<typeof mapAuthorData>[],
  ): Promise<{
    created: number;
    updated: number;
  }> {
    const authorKeys = batch.map((author) => author.openLibraryKey);

    const existingAuthors = await this.prisma.bookAuthor.findMany({
      where: {
        openLibraryKey: {
          in: authorKeys,
        },
      },
      select: {
        openLibraryKey: true,
        revision: true,
      },
    });

    const existingAuthorMap = new Map(
      existingAuthors.map((author) => [author.openLibraryKey, author]),
    );

    const authorsToCreate = batch.filter(
      (author) => !existingAuthorMap.has(author.openLibraryKey),
    );

    const authorsToUpdate = batch.filter((author) => {
      const existing = existingAuthorMap.get(author.openLibraryKey);

      if (!existing) {
        return false;
      }

      return author.revision > existing.revision;
    });

    let created = 0;
    let updated = 0;

    if (authorsToCreate.length > 0) {
      const createResult = await this.prisma.bookAuthor.createMany({
        data: authorsToCreate,
        skipDuplicates: true,
      });

      created = createResult.count;
    }

    if (authorsToUpdate.length > 0) {
      await this.prisma.$transaction(
        authorsToUpdate.map((author) =>
          this.prisma.bookAuthor.update({
            where: {
              openLibraryKey: author.openLibraryKey,
            },
            data: {
              revision: author.revision,
              sourceModifiedAt: author.sourceModifiedAt,
              name: author.name,
              syncedAt: author.syncedAt,
            },
          }),
        ),
      );

      updated = authorsToUpdate.length;
    }

    this.logger.log(
      `Author Batch 저장 완료: input=${batch.length}, created=${created}, updated=${updated}`,
    );

    return {
      created,
      updated,
    };
  }

  /**
   * Work 데이터를 저장한 뒤
   * Work-Author 관계를 생성합니다.
   *
   * 신규 Work는 createMany로 저장하고,
   * 기존 Work는 incoming revision이 더 높은 경우에만 갱신합니다.
   */
  private async saveWorkBatch(
    batch: {
      work: ReturnType<typeof mapWorkData>;
      authorKeys: string[];
    }[],
  ): Promise<{
    created: number;
    updated: number;
  }> {
    const works = batch.map((item) => item.work);

    const workKeys = works.map((work) => work.openLibraryKey);

    const existingWorks = await this.prisma.bookWork.findMany({
      where: {
        openLibraryKey: {
          in: workKeys,
        },
      },
      select: {
        openLibraryKey: true,
        revision: true,
      },
    });

    const existingWorkMap = new Map(
      existingWorks.map((work) => [work.openLibraryKey, work]),
    );

    const worksToCreate = works.filter(
      (work) => !existingWorkMap.has(work.openLibraryKey),
    );

    const worksToUpdate = works.filter((work) => {
      const existing = existingWorkMap.get(work.openLibraryKey);

      if (!existing) {
        return false;
      }

      return work.revision > existing.revision;
    });

    let created = 0;
    let updated = 0;

    if (worksToCreate.length > 0) {
      const createResult = await this.prisma.bookWork.createMany({
        data: worksToCreate,
        skipDuplicates: true,
      });

      created = createResult.count;
    }

    if (worksToUpdate.length > 0) {
      await this.prisma.$transaction(
        worksToUpdate.map((work) =>
          this.prisma.bookWork.update({
            where: {
              openLibraryKey: work.openLibraryKey,
            },
            data: {
              revision: work.revision,
              sourceModifiedAt: work.sourceModifiedAt,
              title: work.title,
              subtitle: work.subtitle,
              description: work.description,
              firstPublishDate: work.firstPublishDate,
              coverIds: work.coverIds,
              syncedAt: work.syncedAt,
            },
          }),
        ),
      );

      updated = worksToUpdate.length;
    }

    /**
     * 신규 생성 / 갱신 이후
     * 관계 생성을 위해 내부 Work ID를 조회합니다.
     */
    const savedWorks = await this.prisma.bookWork.findMany({
      where: {
        openLibraryKey: {
          in: workKeys,
        },
      },
      select: {
        id: true,
        openLibraryKey: true,
      },
    });

    const authorKeys = [...new Set(batch.flatMap((item) => item.authorKeys))];

    const savedAuthors = await this.prisma.bookAuthor.findMany({
      where: {
        openLibraryKey: {
          in: authorKeys,
        },
      },
      select: {
        id: true,
        openLibraryKey: true,
      },
    });

    const workIdMap = new Map(
      savedWorks.map((work) => [work.openLibraryKey, work.id]),
    );

    const authorIdMap = new Map(
      savedAuthors.map((author) => [author.openLibraryKey, author.id]),
    );

    const relations = batch.flatMap((item) => {
      const workId = workIdMap.get(item.work.openLibraryKey);

      if (!workId) {
        this.logger.warn(
          `Work를 찾을 수 없어 관계 생성을 건너뜁니다: work=${item.work.openLibraryKey}`,
        );

        return [];
      }

      return item.authorKeys.flatMap((authorKey) => {
        const authorId = authorIdMap.get(authorKey);

        if (!authorId) {
          this.logger.warn(
            `Author를 찾을 수 없어 관계 생성을 건너뜁니다: work=${item.work.openLibraryKey}, author=${authorKey}`,
          );

          return [];
        }

        return [
          {
            workId,
            authorId,
          },
        ];
      });
    });

    let relationCreated = 0;

    if (relations.length > 0) {
      const relationResult = await this.prisma.bookWorkAuthor.createMany({
        data: relations,
        skipDuplicates: true,
      });

      relationCreated = relationResult.count;
    }

    this.logger.log(
      `Work Batch 저장 완료: input=${batch.length}, created=${created}, updated=${updated}, relationsCreated=${relationCreated}`,
    );

    return {
      created,
      updated,
    };
  }

  /**
   * Edition Batch에서 참조하는 Work를 조회한 뒤
   * 내부 workId를 연결하여 BookEdition을 저장합니다.
   *
   * 신규 Edition은 생성하고,
   * 기존 Edition은 incoming revision이 더 높은 경우에만 갱신합니다.
   */
  private async saveEditionBatch(
    batch: {
      data: OpenLibraryEditionData;
      revision: number;
      lastModified: Date;
      workKey: string;
    }[],
  ): Promise<{
    created: number;
    updated: number;
    failed: number;
  }> {
    /**
     * Edition이 참조하는 Work Key를 중복 제거합니다.
     */
    const workKeys = [...new Set(batch.map((item) => item.workKey))];

    /**
     * Edition이 참조하는 Work를 Batch 조회합니다.
     */
    const savedWorks = await this.prisma.bookWork.findMany({
      where: {
        openLibraryKey: {
          in: workKeys,
        },
      },
      select: {
        id: true,
        openLibraryKey: true,
      },
    });

    const workIdMap = new Map(
      savedWorks.map((work) => [work.openLibraryKey, work.id]),
    );

    let failed = 0;

    /**
     * 참조 Work가 정상적으로 존재하는 Edition만
     * Prisma 저장 형태로 변환합니다.
     */
    const editions = batch.flatMap((item) => {
      const workId = workIdMap.get(item.workKey);

      if (!workId) {
        failed += 1;

        this.logger.warn(
          `Work를 찾을 수 없어 Edition 저장을 건너뜁니다: edition=${item.data.key}, work=${item.workKey}`,
        );

        return [];
      }

      return [
        mapEditionData(item.data, item.revision, item.lastModified, workId),
      ];
    });

    if (editions.length === 0) {
      return {
        created: 0,
        updated: 0,
        failed,
      };
    }

    /**
     * 현재 DB에 저장된 Edition과 revision을 조회합니다.
     */
    const editionKeys = editions.map((edition) => edition.openLibraryKey);

    const existingEditions = await this.prisma.bookEdition.findMany({
      where: {
        openLibraryKey: {
          in: editionKeys,
        },
      },
      select: {
        openLibraryKey: true,
        revision: true,
      },
    });

    const existingEditionMap = new Map(
      existingEditions.map((edition) => [edition.openLibraryKey, edition]),
    );

    /**
     * 아직 DB에 존재하지 않는 Edition
     */
    const editionsToCreate = editions.filter(
      (edition) => !existingEditionMap.has(edition.openLibraryKey),
    );

    /**
     * 기존 Edition보다 incoming revision이 높은 데이터
     */
    const editionsToUpdate = editions.filter((edition) => {
      const existing = existingEditionMap.get(edition.openLibraryKey);

      if (!existing) {
        return false;
      }

      return edition.revision > existing.revision;
    });

    let created = 0;
    let updated = 0;

    /**
     * 신규 Edition Batch Insert
     */
    if (editionsToCreate.length > 0) {
      const createResult = await this.prisma.bookEdition.createMany({
        data: editionsToCreate,
        skipDuplicates: true,
      });

      created = createResult.count;
    }

    /**
     * 기존 Edition 중 더 높은 revision만 갱신합니다.
     */
    if (editionsToUpdate.length > 0) {
      await this.prisma.$transaction(
        editionsToUpdate.map((edition) =>
          this.prisma.bookEdition.update({
            where: {
              openLibraryKey: edition.openLibraryKey,
            },
            data: {
              workId: edition.workId,
              revision: edition.revision,
              sourceModifiedAt: edition.sourceModifiedAt,
              title: edition.title,
              subtitle: edition.subtitle,
              isbn10: edition.isbn10,
              isbn13: edition.isbn13,
              publishers: edition.publishers,
              publishDate: edition.publishDate,
              languages: edition.languages,
              coverIds: edition.coverIds,
              syncedAt: edition.syncedAt,
            },
          }),
        ),
      );

      updated = editionsToUpdate.length;
    }

    this.logger.log(
      `Edition Batch 저장 완료: input=${batch.length}, created=${created}, updated=${updated}, failed=${failed}`,
    );

    return {
      created,
      updated,
      failed,
    };
  }

  /**
   * Dump TSV 영역에 기록된 Open Library Key와
   * JSON 내부 데이터의 Key가 동일한지 확인합니다.
   *
   * 동일한 레코드를 가리키는 두 Key가 서로 다를 경우
   * 데이터 무결성을 보장할 수 없으므로 저장하지 않습니다.
   */
  private isSameOpenLibraryKey(
    recordKey: string,
    dataKey: string | undefined,
  ): boolean {
    return Boolean(dataKey) && recordKey === dataKey;
  }
}
