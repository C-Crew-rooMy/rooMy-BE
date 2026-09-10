-- CreateEnum
CREATE TYPE "book_sync_status" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "book_sync_type" AS ENUM ('FULL', 'INCREMENTAL');

-- CreateEnum
CREATE TYPE "book_sync_target" AS ENUM ('WORK', 'EDITION', 'AUTHOR');

-- CreateTable
CREATE TABLE "book_works" (
    "id" BIGSERIAL NOT NULL,
    "open_library_key" VARCHAR(100) NOT NULL,
    "revision" INTEGER NOT NULL,
    "source_modified_at" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "subtitle" VARCHAR(500),
    "description" TEXT,
    "first_publish_date" VARCHAR(100),
    "cover_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_editions" (
    "id" BIGSERIAL NOT NULL,
    "work_id" BIGINT NOT NULL,
    "open_library_key" VARCHAR(100) NOT NULL,
    "revision" INTEGER NOT NULL,
    "source_modified_at" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "subtitle" VARCHAR(500),
    "isbn_10" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isbn_13" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publish_date" VARCHAR(100),
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cover_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_authors" (
    "id" BIGSERIAL NOT NULL,
    "open_library_key" VARCHAR(100) NOT NULL,
    "revision" INTEGER NOT NULL,
    "source_modified_at" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_work_authors" (
    "work_id" BIGINT NOT NULL,
    "author_id" BIGINT NOT NULL,

    CONSTRAINT "book_work_authors_pkey" PRIMARY KEY ("work_id","author_id")
);

-- CreateTable
CREATE TABLE "post_books" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "edition_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_sync_logs" (
    "id" BIGSERIAL NOT NULL,
    "sync_type" "book_sync_type" NOT NULL,
    "target" "book_sync_target" NOT NULL,
    "status" "book_sync_status" NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "book_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_works_open_library_key_key" ON "book_works"("open_library_key");

-- CreateIndex
CREATE INDEX "book_works_title_idx" ON "book_works"("title");

-- CreateIndex
CREATE INDEX "book_works_source_modified_at_idx" ON "book_works"("source_modified_at");

-- CreateIndex
CREATE UNIQUE INDEX "book_editions_open_library_key_key" ON "book_editions"("open_library_key");

-- CreateIndex
CREATE INDEX "book_editions_work_id_idx" ON "book_editions"("work_id");

-- CreateIndex
CREATE INDEX "book_editions_title_idx" ON "book_editions"("title");

-- CreateIndex
CREATE INDEX "book_editions_source_modified_at_idx" ON "book_editions"("source_modified_at");

-- CreateIndex
CREATE UNIQUE INDEX "book_authors_open_library_key_key" ON "book_authors"("open_library_key");

-- CreateIndex
CREATE INDEX "book_authors_name_idx" ON "book_authors"("name");

-- CreateIndex
CREATE INDEX "book_authors_source_modified_at_idx" ON "book_authors"("source_modified_at");

-- CreateIndex
CREATE INDEX "book_work_authors_author_id_idx" ON "book_work_authors"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_books_post_id_key" ON "post_books"("post_id");

-- CreateIndex
CREATE INDEX "post_books_edition_id_idx" ON "post_books"("edition_id");

-- CreateIndex
CREATE INDEX "book_sync_logs_status_idx" ON "book_sync_logs"("status");

-- CreateIndex
CREATE INDEX "book_sync_logs_started_at_idx" ON "book_sync_logs"("started_at");

-- CreateIndex
CREATE INDEX "book_sync_logs_sync_type_target_idx" ON "book_sync_logs"("sync_type", "target");

-- AddForeignKey
ALTER TABLE "book_editions" ADD CONSTRAINT "book_editions_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "book_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_work_authors" ADD CONSTRAINT "book_work_authors_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "book_works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_work_authors" ADD CONSTRAINT "book_work_authors_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "book_authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_books" ADD CONSTRAINT "post_books_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_books" ADD CONSTRAINT "post_books_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "book_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
