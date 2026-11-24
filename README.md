# Cortex RAG — Enterprise Knowledge Base & Semantic Search

Upload documents, search them with hybrid vector + keyword retrieval, and get answers that cite the exact passages they came from.

Built with Next.js 16 (App Router), PostgreSQL + pgvector, the Vercel AI SDK (OpenAI or Google Gemini), Tailwind CSS 4 and Prisma.

## Features

- **Grounded chat with citations**: every answer cites the retrieved chunks `[n]`, and a heuristic sentence-level audit flags unsupported claims.
- **Conversation memory**: follow-up questions are rewritten into standalone search queries, and the last turns are sent to the model.
- **Hybrid retrieval**: pgvector cosine search (HNSW) + PostgreSQL full-text search fused with Reciprocal Rank Fusion, then a lexical re-ranker.
- **Ingestion pipeline**: PDF / TXT / MD / JSON / CSV, file-signature checks, PII & secret redaction (API keys, NIK, card and phone numbers), recursive chunking, batched embedding inserts. Original files are stored for download and re-indexing.
- **Accounts & tenancy**: real accounts (scrypt-hashed passwords), private knowledge bases, read-only link sharing, and sandboxed demo profiles that are isolated per browser.
- **Quotas**: per-plan question, document, file-size and knowledge-base limits. Rate limits are shared across instances via Upstash Redis. Bring-Your-Own-Key (BYOK) skips the plan quota only when the caller's own key is actually used.
- **English / Bahasa Indonesia** UI, API messages and model answers.
- **Developer API docs** at `/docs` with a live console.

## Quick start (local, no database)

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

```bash
pnpm dev
```

Open http://localhost:3000. Without `DATABASE_URL` the app uses an **in-memory store**, and the dashboard shows a banner that data is not persistent. Without AI keys, answers are deterministic quotes of the retrieved passages.

## With PostgreSQL + pgvector

```bash
docker compose up -d db
```

```bash
echo 'DATABASE_URL=postgresql://cortex:cortex-local-dev-only@localhost:5432/cortex_rag' >> .env.local
```

```bash
pnpm db:migrate
```

```bash
pnpm dev
```

To run the whole stack in containers, set `AUTH_SECRET` in a `.env` file next to `docker-compose.yml`, then run `docker compose up -d`. The app container applies migrations on start.

## Configuration

See [`.env.example`](.env.example) for every variable. The important ones:

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | **Required in production.** Signs session tokens. Without it, sign-in is disabled in production. |
| `DATABASE_URL` | PostgreSQL with pgvector. Unset means the non-persistent in-memory store. |
| `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Embeddings and answer generation. Models can be overridden with `OPENAI_CHAT_MODEL`, `GOOGLE_CHAT_MODEL`, etc. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Shared rate limiting (recommended on serverless). |
| `NEXT_PUBLIC_APP_URL` | Canonical URL for robots.txt, the sitemap and Open Graph. |
| `ADMIN_EMAILS` | Accounts that may manage the public demo knowledge base. |

All embeddings are stored as 1536-dimensional vectors (Gemini embeddings are requested at 1536 dims). Each document records the embedding model it was indexed with. After switching providers, use **Re-index** in the document details to re-embed older documents.

## Security model

- Knowledge bases are **private** to their owner. **Link sharing** gives read-only search and chat to anyone with the link. The demo knowledge base `default-kb-1` is **public and read-only**.
- Every document, session, export, import, seed, search and chat request is checked against the caller's access. Resources the caller cannot see return `404`.
- Sessions are signed, expiring (7 days), HttpOnly cookies. Signing out of a real account revokes all of its sessions.
- Sign-in is rate-limited per IP and per e-mail. Uploads, search, chat and writes are rate-limited per user or IP.
- The site sends CSP, X-Frame-Options, HSTS, nosniff, Referrer-Policy and Permissions-Policy headers. Downloaded originals are always served as attachments.
- API errors return a stable `code` plus a localized message. Internal error details are logged, never returned.

## Testing

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

`pnpm test` runs the Vitest suites: unit tests, route-level security tests (tenant isolation, auth, quota/BYOK regression, persistence) and, when `TEST_DATABASE_URL` points at a migrated database, the PostgreSQL integration test. CI (GitHub Actions and GitLab CI) runs lint, type-check, migrations, tests with a pgvector service, and the production build.

The `scripts/*.mjs` files are older smoke scripts that run against a live server. Two of them (`e2e-ui-ux-audit`, `deep-qa-test`) still assert pre-hardening behaviour and are marked as legacy.

## Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) (Bahasa Indonesia) for Vercel, Docker and environment setup.

## Not implemented yet

- SSO (SAML / OIDC), team workspaces with invitations and per-knowledge-base roles, audit log
- Password reset and e-mail verification (needs an e-mail provider)
- Billing (plans are limits only)
- DOCX / PPTX / XLSX ingestion, OCR for scanned PDFs, connectors (Google Drive, Notion, Confluence, web pages)
- Background ingestion queue with progress updates (ingestion currently runs inside the upload request, up to 60 s)

---

Designed and developed by Dandy Rahmat Zain.
