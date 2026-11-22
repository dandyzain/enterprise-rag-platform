-- Seed the built-in default knowledge base.
--
-- The app uses it whenever a request names no knowledge base
-- (DEFAULT_KNOWLEDGE_BASE_ID in lib/knowledge-base.ts). Documents and chat
-- sessions reference knowledge_bases by foreign key, so without this row every
-- write to the default knowledge base would fail. Its id used to be
-- "default-kb-1", which is not a valid UUID.
INSERT INTO "knowledge_bases" ("id", "user_id", "name", "description")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'user_enterprise',
  'Enterprise Core Knowledge',
  'Dokumentasi standar SOP, arsitektur sistem, dan panduan operasional perusahaan.'
)
ON CONFLICT ("id") DO NOTHING;
