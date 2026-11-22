-- Align a database created by 0_init with prisma/schema.prisma.
--
-- 0_init stored documents.status and messages.role as VARCHAR and never
-- created the enum types that schema.prisma declares, so every Prisma write
-- to those tables failed with `type "public.DocumentStatus" does not exist`.
-- It also used VARCHAR(n) for free-text columns that the schema declares as
-- unbounded TEXT, and index names that differ from the ones Prisma expects.
--
-- Columns are converted in place, so existing rows are kept. Prisma applies
-- this file as a single transaction: if a row holds a value outside the new
-- enum, the cast fails and nothing in this file is applied.

-- 1. Enum types
CREATE TYPE "DocumentStatus" AS ENUM ('PROCESSING', 'INDEXED', 'FAILED');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- 2. documents.status: VARCHAR(50) -> "DocumentStatus".
--    The VARCHAR default cannot be cast, so it is dropped and set again.
ALTER TABLE "documents" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "documents"
  ALTER COLUMN "status" SET DATA TYPE "DocumentStatus" USING ("status"::text::"DocumentStatus");
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';

-- 3. messages.role: VARCHAR(50) -> "MessageRole"
ALTER TABLE "messages"
  ALTER COLUMN "role" SET DATA TYPE "MessageRole" USING ("role"::text::"MessageRole");

-- 4. VARCHAR(n) -> TEXT. Postgres does this without rewriting the tables.
ALTER TABLE "knowledge_bases"
  ALTER COLUMN "user_id" SET DATA TYPE TEXT,
  ALTER COLUMN "name" SET DATA TYPE TEXT;

ALTER TABLE "documents"
  ALTER COLUMN "title" SET DATA TYPE TEXT,
  ALTER COLUMN "file_type" SET DATA TYPE TEXT;

ALTER TABLE "chat_sessions"
  ALTER COLUMN "user_id" SET DATA TYPE TEXT,
  ALTER COLUMN "title" SET DATA TYPE TEXT;

-- 5. Foreign-key index names, renamed to Prisma's defaults
ALTER INDEX "idx_documents_kb_id" RENAME TO "documents_knowledge_base_id_idx";
ALTER INDEX "idx_document_chunks_doc_id" RENAME TO "document_chunks_document_id_idx";
ALTER INDEX "idx_chat_sessions_kb_id" RENAME TO "chat_sessions_knowledge_base_id_idx";
ALTER INDEX "idx_messages_session_id" RENAME TO "messages_chat_session_id_idx";
