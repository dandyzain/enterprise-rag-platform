import type { Locale } from "@/lib/i18n/types";

/**
 * Localized API messages. Every API response carries a stable `code` plus a
 * human readable `error` / `message` in the caller's language.
 */
const MESSAGES = {
  // Generic
  INTERNAL: {
    en: "Something went wrong on our side. Please try again.",
    id: "Terjadi kesalahan pada server. Silakan coba lagi.",
  },
  INVALID_JSON: { en: "The request body is not valid JSON.", id: "Isi permintaan bukan JSON yang valid." },
  VALIDATION: { en: "Invalid request parameters.", id: "Parameter permintaan tidak valid." },
  RATE_LIMITED: {
    en: "Too many requests. Please try again in {seconds} seconds.",
    id: "Terlalu banyak permintaan. Silakan coba lagi dalam {seconds} detik.",
  },

  // Auth
  UNAUTHENTICATED: { en: "Please sign in first.", id: "Silakan masuk terlebih dahulu." },
  AUTH_NOT_CONFIGURED: {
    en: "Sign-in is unavailable: the server has no AUTH_SECRET configured.",
    id: "Fitur masuk tidak tersedia: server belum dikonfigurasi dengan AUTH_SECRET.",
  },
  DEMO_DISABLED: { en: "Demo profiles are disabled on this server.", id: "Profil demo dinonaktifkan di server ini." },
  INVALID_EMAIL: { en: "Please enter a valid email address.", id: "Alamat email tidak valid." },
  PASSWORD_TOO_SHORT: {
    en: "Password must be at least {min} characters.",
    id: "Kata sandi minimal {min} karakter.",
  },
  NAME_REQUIRED: {
    en: "Full name is required (at least 2 characters).",
    id: "Nama lengkap wajib diisi (minimal 2 karakter).",
  },
  INVALID_CREDENTIALS: { en: "Incorrect email or password.", id: "Email atau kata sandi salah." },
  EMAIL_TAKEN: {
    en: "An account with this email already exists. Please sign in instead.",
    id: "Email ini sudah terdaftar. Silakan masuk.",
  },
  LOGIN_SUCCESS: { en: "Welcome back, {name}!", id: "Selamat datang kembali, {name}!" },
  REGISTER_SUCCESS: { en: "Account created. Welcome, {name}!", id: "Akun berhasil dibuat. Selamat datang, {name}!" },
  DEMO_SUCCESS: {
    en: "Switched to demo profile: {name} ({plan} plan)",
    id: "Beralih ke profil demo: {name} (paket {plan})",
  },
  LOGOUT_SUCCESS: { en: "You have been signed out.", id: "Anda telah keluar." },

  // Knowledge bases
  KB_NOT_FOUND: { en: "Knowledge base not found.", id: "Knowledge Base tidak ditemukan." },
  KB_READ_ONLY: {
    en: "This knowledge base is read-only for you. Create your own knowledge base to upload or change documents.",
    id: "Knowledge Base ini hanya-baca untuk Anda. Buat Knowledge Base sendiri untuk mengunggah atau mengubah dokumen.",
  },
  KB_LIMIT: {
    en: "Knowledge base limit reached ({limit} on the {plan} plan).",
    id: "Batas jumlah Knowledge Base tercapai ({limit} pada paket {plan}).",
  },
  KB_NAME_REQUIRED: {
    en: "Knowledge base name must be at least 2 characters.",
    id: "Nama Knowledge Base minimal 2 karakter.",
  },
  KB_CREATED: { en: 'Knowledge base "{name}" created.', id: 'Knowledge Base "{name}" berhasil dibuat.' },
  KB_SHARED: {
    en: "Link sharing enabled. Anyone with the link can search and chat with this knowledge base (read-only).",
    id: "Berbagi via tautan aktif. Siapa pun yang memiliki tautan dapat mencari dan chat dengan Knowledge Base ini (hanya-baca).",
  },
  KB_UNSHARED: { en: "Link sharing disabled.", id: "Berbagi via tautan dinonaktifkan." },
  BACKUP_INVALID: {
    en: "Invalid backup file. It must contain a knowledgeBase object.",
    id: "File backup tidak valid. Harus menyertakan objek knowledgeBase.",
  },
  BACKUP_RESTORED: {
    en: 'Knowledge base "{name}" restored ({documents} documents, {chunks} chunks).',
    id: 'Knowledge Base "{name}" berhasil dipulihkan ({documents} dokumen, {chunks} chunks).',
  },

  // Documents
  DOC_NOT_FOUND: { en: "Document not found.", id: "Dokumen tidak ditemukan." },
  DOC_DELETED: { en: "Document and its chunks were deleted.", id: "Dokumen dan chunk terkait berhasil dihapus." },
  DOC_LIMIT: {
    en: "Document quota reached ({count}/{limit} on the {plan} plan). Delete old documents or upgrade.",
    id: "Batas kuota dokumen tercapai ({count}/{limit} pada paket {plan}). Hapus dokumen lama atau tingkatkan paket.",
  },
  FILE_REQUIRED: {
    en: "Attach a file as multipart/form-data (field: 'file').",
    id: "File wajib dilampirkan dalam format multipart/form-data (field: 'file').",
  },
  FILE_TYPE: {
    en: "Unsupported file type. Upload PDF, TXT, MD, JSON or CSV.",
    id: "Tipe file tidak didukung. Unggah PDF, TXT, MD, JSON, atau CSV.",
  },
  FILE_TOO_LARGE: {
    en: "File size ({size} MB) exceeds the {plan} plan limit ({limit} MB).",
    id: "Ukuran file ({size} MB) melebihi batas paket {plan} ({limit} MB).",
  },
  FILE_EMPTY: { en: "The file is empty.", id: "Berkas kosong." },
  FILE_EXECUTABLE: { en: "Executable files are not allowed.", id: "Berkas executable tidak diizinkan." },
  FILE_NOT_PDF: {
    en: "The file is not a valid PDF (missing %PDF- signature).",
    id: "Berkas bukan PDF yang valid (tanda %PDF- tidak ditemukan).",
  },
  FILE_NO_TEXT: {
    en: "No text could be extracted from this document. Scanned PDFs need OCR before upload.",
    id: "Teks tidak dapat diekstraksi dari dokumen ini. PDF hasil scan perlu OCR sebelum diunggah.",
  },
  EMBEDDING_FAILED: {
    en: "The embedding provider failed. Please try again later.",
    id: "Penyedia embedding gagal. Silakan coba lagi nanti.",
  },
  DOC_INDEXED: {
    en: 'File "{name}" was parsed into {chunks} chunks and indexed.',
    id: 'File "{name}" berhasil dianalisis menjadi {chunks} chunks dan diindeks.',
  },
  DOC_REINDEXED: {
    en: 'Document "{name}" re-indexed ({chunks} chunks).',
    id: 'Dokumen "{name}" berhasil diindeks ulang ({chunks} chunks).',
  },
  NO_ORIGINAL_FILE: {
    en: "The original file for this document is not stored.",
    id: "File asli untuk dokumen ini tidak tersimpan.",
  },
  SEEDED: {
    en: "Indexed {count} sample enterprise documents.",
    id: "Berhasil mengindeks {count} dokumen contoh enterprise.",
  },

  // Chat & search
  MESSAGES_REQUIRED: {
    en: "The messages array must contain at least one user message.",
    id: "Riwayat pesan harus berisi minimal satu pesan pengguna.",
  },
  QUERY_REQUIRED: { en: "The 'q' or 'query' parameter is required.", id: "Parameter 'q' atau 'query' wajib diisi." },
  QUOTA_CHAT: {
    en: "Question quota reached ({limit} queries/hour on the {plan} plan). Wait {seconds} seconds, upgrade your plan, or use your own API key (BYOK) in Settings.",
    id: "Batas kuota pertanyaan tercapai ({limit} query/jam pada paket {plan}). Tunggu {seconds} detik, tingkatkan paket, atau gunakan API key pribadi (BYOK) di Pengaturan.",
  },
  SESSION_NOT_FOUND: { en: "Chat session not found.", id: "Sesi obrolan tidak ditemukan." },
  SESSION_TITLE_REQUIRED: { en: "Session title cannot be empty.", id: "Judul sesi tidak boleh kosong." },
  SESSION_DELETED: { en: "Chat session deleted.", id: "Sesi obrolan dihapus." },
  SESSION_RENAMED: { en: "Session title updated.", id: "Judul sesi berhasil diperbarui." },
  MESSAGE_NOT_FOUND: { en: "Message not found.", id: "Pesan tidak ditemukan." },
} as const satisfies Record<string, Record<Locale, string>>;

export type MessageCode = keyof typeof MESSAGES;

export function translate(
  code: MessageCode,
  locale: Locale,
  params: Record<string, string | number> = {}
): string {
  const template: string = MESSAGES[code]?.[locale] ?? MESSAGES[code]?.en ?? MESSAGES.INTERNAL.en;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

/** Locale from the `x-locale` header, the `app_locale` cookie, then Accept-Language. */
export function detectLocale(headers: Headers, cookieLocale?: string | null): Locale {
  const explicit = headers.get("x-locale") || cookieLocale;
  if (explicit === "id" || explicit === "en") return explicit;
  const accept = headers.get("accept-language")?.toLowerCase() || "";
  const first = accept.split(",")[0]?.trim() || "";
  if (first.startsWith("id") || first.startsWith("in")) return "id";
  return "en";
}
