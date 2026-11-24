# 🚀 Panduan Deployment Cortex Enterprise RAG Platform

Dokumentasi ini menjelaskan konfigurasi deployment, repositori Git (GitLab & GitHub), serta status live deployment aplikasi **Cortex Enterprise RAG Platform**.

---

## 🌐 1. Live Production Deployment (Vercel)

Aplikasi telah berhasil di-deploy ke **Vercel Production**:
* **Live Production URL:** [https://enterprise-rag-platform-two.vercel.app](https://enterprise-rag-platform-two.vercel.app)
* **Direct Deployment URL:** [https://enterprise-rag-platform-nuzbmjy6n-dandy-rahmat-zains-projects.vercel.app](https://enterprise-rag-platform-nuzbmjy6n-dandy-rahmat-zains-projects.vercel.app)
* **Vercel Project Dashboard:** [https://vercel.com/dandy-rahmat-zains-projects/enterprise-rag-platform](https://vercel.com/dandy-rahmat-zains-projects/enterprise-rag-platform)
* **Health Check Endpoint:** [https://enterprise-rag-platform-two.vercel.app/api/health](https://enterprise-rag-platform-two.vercel.app/api/health)

### ⚠️ Wajib sebelum deploy versi ini ke produksi
Versi ini menambahkan akun sungguhan dan penyimpanan permanen. Atur di **Vercel → Project → Settings → Environment Variables**:

| Variable | Wajib? | Keterangan |
| :--- | :--- | :--- |
| `AUTH_SECRET` | **Ya** | Minimal 32 karakter acak (`openssl rand -base64 48`). Tanpa ini fitur masuk/daftar dimatikan di produksi (situs tetap jalan sebagai tamu). |
| `DATABASE_URL` | Sangat disarankan | PostgreSQL + pgvector (mis. Neon atau Supabase). Tanpa ini data hanya di memori dan hilang setiap cold start. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Disarankan | Rate limit yang konsisten antar instance serverless (atau `KV_REST_API_URL` / `KV_REST_API_TOKEN` dari Vercel KV/Upstash Marketplace). |
| `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Opsional | Embedding & jawaban LLM. Tanpa key, jawaban berupa kutipan langsung (mode demo). |
| `NEXT_PUBLIC_APP_URL` | Opsional | URL kanonik; di Vercel otomatis memakai `VERCEL_PROJECT_PRODUCTION_URL`. |
| `ADMIN_EMAILS` | Opsional | Email (dipisah koma) yang boleh mengelola Knowledge Base demo publik. |

**Migrasi database** (sekali, dan setiap ada migrasi baru) dari komputer lokal:
```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```
Migrasi `1_auth_storage_and_text_ids` mengubah kolom id UUID menjadi TEXT, menambah tabel `users` & `document_files`, kolom `visibility`/`embedding_model`/`feedback`, indeks full-text, serta membuat Knowledge Base demo publik `default-kb-1`.

### Fitur Produksi
- Akun nyata (hash scrypt), sesi bertanda tangan + kedaluwarsa, logout mencabut semua sesi
- Isolasi tenant: KB privat, berbagi via tautan (hanya-baca), KB demo publik hanya-baca, profil demo terisolasi per browser
- PostgreSQL + pgvector (HNSW) + full-text search; file asli tersimpan untuk unduh & indeks ulang
- Rate limit Upstash Redis; BYOK hanya membebaskan kuota bila key milik pengguna benar-benar dipakai
- Memori percakapan, prompt EN/ID, pelindung prompt-injection, umpan balik jawaban tersimpan
- Header keamanan (CSP, HSTS, X-Frame-Options, dll.), halaman 404/error, Kebijakan Privasi & Ketentuan Layanan
- Multilingual i18n (English default & Bahasa Indonesia), Dark / Light / System theme

---

## 🦊 2. GitLab Repository (Sudah Ter-Push & Aktif)

Repositori GitLab telah dibuat dan seluruh kode sumber telah di-push:
* **GitLab URL:** [https://gitlab.com/dandyzain.personal/enterprise-rag-platform](https://gitlab.com/dandyzain.personal/enterprise-rag-platform)
* **Remote Git:** `git@gitlab.com:dandyzain.personal/enterprise-rag-platform.git`
* **Branch Utama:** `master`
* **GitLab CI/CD:** `.gitlab-ci.yml` menjalankan lint, type-check, migrasi, test (dengan service pgvector), dan build.

---

## 🐙 3. GitHub Repository

Remote GitHub telah dikonfigurasi pada git lokal:
* **Remote Target:** `git@github.com:dandyzain/enterprise-rag-platform.git`
* **GitHub Actions:** `.github/workflows/deploy.yml` menjalankan lint, type-check, migrasi, test (dengan service pgvector), dan build.

### Langkah Menyelesaikan Push ke GitHub:
Karena GitHub mengharuskan repositori dibuat terlebih dahulu di web sebelum menerima SSH push pertama:
1. Buka [https://github.com/new](https://github.com/new).
2. Isi **Repository name**: `enterprise-rag-platform`.
3. Pilih **Private** atau **Public** (jangan centang *"Add a README file"*).
4. Klik **Create repository**.
5. Jalankan perintah berikut di terminal:
```powershell
git push -u github master
```
Atau cukup jalankan:
```powershell
git push -u origin master
```
*(Remote `origin` sudah dikonfigurasi untuk otomatis push serentak ke GitLab dan GitHub).*

---

## 🐳 4. Docker Container Deployment

`docker-compose.yml` menjalankan aplikasi bersama PostgreSQL + pgvector. Container aplikasi menjalankan `prisma migrate deploy` otomatis saat start bila `DATABASE_URL` diisi.

```bash
# 1. Buat file .env di samping docker-compose.yml
echo "AUTH_SECRET=$(openssl rand -base64 48)" > .env

# 2. Jalankan stack (app + database)
docker compose up -d
```

Hanya database untuk development lokal:
```bash
docker compose up -d db
```

## ⚙️ 5. Environment Variables

Daftar lengkap beserta penjelasan ada di [`.env.example`](.env.example). Ringkasan perilaku default:

| Variable | Jika tidak diisi |
| :--- | :--- |
| `AUTH_SECRET` | Produksi: masuk/daftar dinonaktifkan. Development: memakai secret khusus dev. |
| `DATABASE_URL` | Penyimpanan in-memory (tidak permanen), ditampilkan sebagai banner di dashboard dan di `/api/health`. |
| `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Embedding hash lokal + jawaban kutipan langsung. |
| `UPSTASH_REDIS_REST_*` | Rate limit per-instance (in-memory). |
| `OPENAI_CHAT_MODEL` | `gpt-5.4-mini` |
| `GOOGLE_CHAT_MODEL` | `gemini-flash-latest` |
| `GOOGLE_EMBEDDING_MODEL` | `gemini-embedding-001` (1536 dimensi) |
| `PORT` | `3000` |
