# 🚀 Panduan Deployment Cortex Enterprise RAG Platform

Dokumentasi ini menjelaskan konfigurasi deployment, repositori Git (GitLab & GitHub), serta status live deployment aplikasi **Cortex Enterprise RAG Platform**.

---

## 🌐 1. Live Production Deployment (Vercel)

Aplikasi telah berhasil di-deploy ke **Vercel Production**:
* **Live Production URL:** [https://enterprise-rag-platform-two.vercel.app](https://enterprise-rag-platform-two.vercel.app)
* **Direct Deployment URL:** [https://enterprise-rag-platform-nuzbmjy6n-dandy-rahmat-zains-projects.vercel.app](https://enterprise-rag-platform-nuzbmjy6n-dandy-rahmat-zains-projects.vercel.app)
* **Vercel Project Dashboard:** [https://vercel.com/dandy-rahmat-zains-projects/enterprise-rag-platform](https://vercel.com/dandy-rahmat-zains-projects/enterprise-rag-platform)
* **Health Check Endpoint:** [https://enterprise-rag-platform-two.vercel.app/api/health](https://enterprise-rag-platform-two.vercel.app/api/health)

### Fitur Cloud Production yang Aktif:
- Serverless & Edge API Routes Next.js 16.4 (Turbopack)
- In-Memory Semantic Vector DB & BM25 Sparse Indexing
- Strict Grounding Engine & Anti-Hallucination Guardrails
- Multilingual i18n (English default & Bahasa Indonesia)
- Dark / Light Mode Class-Based System
- Multi-Tenant RBAC & BYOK (Bring-Your-Own-Key) Quota Bypass

---

## 🦊 2. GitLab Repository (Sudah Ter-Push & Aktif)

Repositori GitLab telah dibuat dan seluruh kode sumber telah di-push:
* **GitLab URL:** [https://gitlab.com/dandyzain.personal/enterprise-rag-platform](https://gitlab.com/dandyzain.personal/enterprise-rag-platform)
* **Remote Git:** `git@gitlab.com:dandyzain.personal/enterprise-rag-platform.git`
* **Branch Utama:** `master`
* **GitLab CI/CD:** `.gitlab-ci.yml` sudah terkonfigurasi untuk testing & automated build.

---

## 🐙 3. GitHub Repository

Remote GitHub telah dikonfigurasi pada git lokal:
* **Remote Target:** `git@github.com:dandyzain/enterprise-rag-platform.git`
* **GitHub Actions:** `.github/workflows/deploy.yml` sudah disiapkan.

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

Aplikasi dilengkapi dengan multi-stage production Dockerfile (`Dockerfile`) dan `docker-compose.yml`:

### Build & Run Container:
```bash
# Build image
docker build -t cortex-enterprise-rag:latest .

# Menjalankan container di port 3000
docker run -d -p 3000:3000 --name cortex-rag cortex-enterprise-rag:latest
```

### Atau via Docker Compose:
```bash
docker compose up -d
```

---

## ⚙️ 5. Environment Variables (Opsional)

Jika ingin menghubungkan ke database cloud atau model AI eksternal:
| Variable | Deskripsi | Default / Fallback |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL dengan pgvector extension | In-Memory Vector Store |
| `OPENAI_API_KEY` | Kunci OpenAI untuk model GPT | Mock Deterministic Vector & Generator |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Kunci Gemini AI | Mock Deterministic Generator |
| `PORT` | Port server aplikasi | `3000` |
