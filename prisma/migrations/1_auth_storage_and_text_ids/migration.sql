-- Migration 1: real accounts, original file storage, sharing, feedback and
-- consistent TEXT ids.
--
-- 0_init created UUID id columns, but the application uses non-UUID ids such as
-- the public demo knowledge base "default-kb-1" and Prisma sends ids as text, so
-- every Postgres query failed and the app silently fell back to memory. This
-- migration converts ids to TEXT and adds the new tables/columns.

-- 1. Drop foreign keys so the referenced columns can change type
ALTER TABLE documents       DROP CONSTRAINT IF EXISTS documents_knowledge_base_id_fkey;
ALTER TABLE document_chunks DROP CONSTRAINT IF EXISTS document_chunks_document_id_fkey;
ALTER TABLE chat_sessions   DROP CONSTRAINT IF EXISTS chat_sessions_knowledge_base_id_fkey;
ALTER TABLE messages        DROP CONSTRAINT IF EXISTS messages_chat_session_id_fkey;

-- 2. UUID -> TEXT
ALTER TABLE knowledge_bases ALTER COLUMN id DROP DEFAULT;
ALTER TABLE knowledge_bases ALTER COLUMN id TYPE TEXT USING id::text;

ALTER TABLE documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE documents ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE documents ALTER COLUMN knowledge_base_id TYPE TEXT USING knowledge_base_id::text;

ALTER TABLE document_chunks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE document_chunks ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE document_chunks ALTER COLUMN document_id TYPE TEXT USING document_id::text;

ALTER TABLE chat_sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE chat_sessions ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE chat_sessions ALTER COLUMN knowledge_base_id TYPE TEXT USING knowledge_base_id::text;

ALTER TABLE messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE messages ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE messages ALTER COLUMN chat_session_id TYPE TEXT USING chat_session_id::text;

-- 3. Restore foreign keys
ALTER TABLE documents ADD CONSTRAINT documents_knowledge_base_id_fkey
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE;
ALTER TABLE document_chunks ADD CONSTRAINT document_chunks_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_knowledge_base_id_fkey
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT messages_chat_session_id_fkey
  FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- 4. New columns
ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_model TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS feedback TEXT;

-- 5. Accounts
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER',
    plan TEXT NOT NULL DEFAULT 'FREE',
    session_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Original uploaded files (download, preview, re-index)
CREATE TABLE IF NOT EXISTS document_files (
    document_id TEXT PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    content BYTEA NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_user_id ON knowledge_bases(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_kb_user ON chat_sessions(knowledge_base_id, user_id);
-- Full-text index used for the sparse (keyword) half of hybrid search, so the
-- server no longer loads every chunk of a knowledge base into memory per query.
CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx
  ON document_chunks USING GIN (to_tsvector('simple', content));

-- 8. Public, read-only demo knowledge base
INSERT INTO knowledge_bases (id, user_id, name, description, visibility)
VALUES (
  'default-kb-1',
  'system',
  'Enterprise Core Knowledge',
  'Public demo knowledge base: sample SOP, security policy and DevOps guides.',
  'public'
)
ON CONFLICT (id) DO UPDATE SET user_id = 'system', visibility = 'public';
