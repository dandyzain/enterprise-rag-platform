"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { CortexLogo } from "@/components/ui/logo";

type Section = { heading: string; body: string[] };
type LegalContent = Record<"en" | "id", { title: string; intro: string; sections: Section[] }>;

const LAST_UPDATED = "2026-11-24";

const PRIVACY: LegalContent = {
  en: {
    title: "Privacy Policy",
    intro:
      "This policy explains what data the Cortex RAG workspace processes, why, and the choices you have. It describes how the software works; the operator of each deployment is responsible for it.",
    sections: [
      {
        heading: "1. Data we process",
        body: [
          "Account data: your name, e-mail address and a salted scrypt hash of your password (never the password itself).",
          "Content you provide: uploaded documents (the original file, extracted text chunks and their vector embeddings), knowledge-base names, chat sessions, questions, answers and answer feedback.",
          "Technical data: IP address (used for rate limiting and abuse prevention) and the cookies listed below.",
        ],
      },
      {
        heading: "2. How content is used",
        body: [
          "Documents are split into chunks, redacted for common secrets and personal identifiers (API keys, Indonesian NIK, card and phone numbers) and indexed so you can search them and receive cited answers.",
          "Your data is not used to train models by this software and is not sold.",
        ],
      },
      {
        heading: "3. Third-party AI providers",
        body: [
          "If the operator configures OpenAI or Google Gemini, document chunks are sent to that provider to create embeddings, and your question plus the retrieved passages are sent to generate answers. Those providers process the data under their own terms.",
          "If you use Bring-Your-Own-Key (BYOK), your key is stored only in your browser's local storage and is forwarded with each chat request to the chosen provider; the server does not store it.",
        ],
      },
      {
        heading: "4. Cookies and local storage",
        body: [
          "cortex_auth_session — signed session cookie (HttpOnly, 7 days) that keeps you signed in.",
          "cortex_vid — random, HttpOnly visitor identifier (1 year) that isolates anonymous chat sessions and demo profiles per browser.",
          "app_locale — your language preference. Theme, onboarding and BYOK settings are kept in local storage on your device.",
        ],
      },
      {
        heading: "5. Sharing and access",
        body: [
          "Knowledge bases are private to their owner. If you enable link sharing, anyone with the link can search and chat with that knowledge base (read-only) until you turn sharing off.",
        ],
      },
      {
        heading: "6. Retention and deletion",
        body: [
          "Deleting a document removes its file, chunks and embeddings. Deleting a chat session removes its messages. Signing out revokes all sessions of your account.",
          "Deployments without a database keep data only in server memory, which is lost when the server restarts.",
        ],
      },
      {
        heading: "7. Your rights and contact",
        body: [
          "You can request access to, correction of or deletion of your data from the operator of this deployment. Add the operator's contact address here before going to production.",
        ],
      },
    ],
  },
  id: {
    title: "Kebijakan Privasi",
    intro:
      "Kebijakan ini menjelaskan data apa yang diproses oleh workspace Cortex RAG, untuk apa, dan pilihan yang Anda miliki. Dokumen ini menjelaskan cara kerja perangkat lunak; operator setiap deployment bertanggung jawab atasnya.",
    sections: [
      {
        heading: "1. Data yang kami proses",
        body: [
          "Data akun: nama, alamat email, dan hash scrypt (dengan salt) dari kata sandi Anda (bukan kata sandinya).",
          "Konten yang Anda berikan: dokumen yang diunggah (file asli, potongan teks hasil ekstraksi, dan embedding vektornya), nama Knowledge Base, sesi chat, pertanyaan, jawaban, dan umpan balik jawaban.",
          "Data teknis: alamat IP (untuk rate limiting dan pencegahan penyalahgunaan) serta cookie yang tercantum di bawah.",
        ],
      },
      {
        heading: "2. Penggunaan konten",
        body: [
          "Dokumen dipecah menjadi potongan, disamarkan dari rahasia dan data pribadi umum (API key, NIK, nomor kartu dan telepon), lalu diindeks agar dapat dicari dan menghasilkan jawaban bersitasi.",
          "Data Anda tidak digunakan untuk melatih model oleh perangkat lunak ini dan tidak dijual.",
        ],
      },
      {
        heading: "3. Penyedia AI pihak ketiga",
        body: [
          "Jika operator mengonfigurasi OpenAI atau Google Gemini, potongan dokumen dikirim ke penyedia tersebut untuk membuat embedding, dan pertanyaan beserta kutipan yang ditemukan dikirim untuk menghasilkan jawaban. Penyedia memproses data sesuai ketentuan mereka sendiri.",
          "Jika Anda memakai Bring-Your-Own-Key (BYOK), key Anda hanya disimpan di local storage browser dan diteruskan bersama setiap permintaan chat ke penyedia yang dipilih; server tidak menyimpannya.",
        ],
      },
      {
        heading: "4. Cookie dan local storage",
        body: [
          "cortex_auth_session — cookie sesi bertanda tangan (HttpOnly, 7 hari) agar Anda tetap masuk.",
          "cortex_vid — pengenal pengunjung acak (HttpOnly, 1 tahun) untuk memisahkan sesi chat anonim dan profil demo per browser.",
          "app_locale — preferensi bahasa. Tema, onboarding, dan pengaturan BYOK disimpan di local storage perangkat Anda.",
        ],
      },
      {
        heading: "5. Berbagi dan akses",
        body: [
          "Knowledge Base bersifat privat bagi pemiliknya. Jika Anda mengaktifkan berbagi via tautan, siapa pun yang memiliki tautan dapat mencari dan chat dengan Knowledge Base tersebut (hanya-baca) sampai berbagi dimatikan.",
        ],
      },
      {
        heading: "6. Retensi dan penghapusan",
        body: [
          "Menghapus dokumen akan menghapus file, potongan teks, dan embedding-nya. Menghapus sesi chat akan menghapus pesannya. Keluar (logout) mencabut semua sesi akun Anda.",
          "Deployment tanpa database hanya menyimpan data di memori server, yang hilang saat server restart.",
        ],
      },
      {
        heading: "7. Hak Anda dan kontak",
        body: [
          "Anda dapat meminta akses, koreksi, atau penghapusan data kepada operator deployment ini. Tambahkan alamat kontak operator di sini sebelum digunakan di produksi.",
        ],
      },
    ],
  },
};

const TERMS: LegalContent = {
  en: {
    title: "Terms of Service",
    intro: "By using this Cortex RAG deployment you agree to the following terms set by its operator.",
    sections: [
      {
        heading: "1. The service",
        body: [
          "Cortex RAG lets you upload documents, search them and ask questions answered from those documents with citations.",
          "Answers are generated automatically and may be incomplete or wrong. Always verify important information against the cited source passages.",
        ],
      },
      {
        heading: "2. Your account",
        body: [
          "Keep your password confidential and use a unique password. You are responsible for activity under your account.",
          "Demo profiles are sandboxes for evaluation; do not upload confidential data to them.",
        ],
      },
      {
        heading: "3. Your content",
        body: [
          "You keep ownership of the documents you upload. You confirm you have the right to upload and process them, including with any configured AI provider.",
          "Do not upload malware, unlawful content, or personal data you are not permitted to process.",
        ],
      },
      {
        heading: "4. Acceptable use and limits",
        body: [
          "Plans have request, document and file-size limits. Do not attempt to bypass rate limits, access other users' data, or disrupt the service.",
          "When using your own API key (BYOK), usage is billed by your provider under your agreement with them.",
        ],
      },
      {
        heading: "5. Availability and changes",
        body: [
          "The service is provided as is, without warranty. The operator may change, suspend or end the service and these terms; material changes should be announced in advance.",
        ],
      },
      {
        heading: "6. Contact",
        body: ["Add the operator's legal name, governing law and contact address here before going to production."],
      },
    ],
  },
  id: {
    title: "Ketentuan Layanan",
    intro: "Dengan menggunakan deployment Cortex RAG ini, Anda menyetujui ketentuan berikut yang ditetapkan oleh operatornya.",
    sections: [
      {
        heading: "1. Layanan",
        body: [
          "Cortex RAG memungkinkan Anda mengunggah dokumen, mencarinya, dan mengajukan pertanyaan yang dijawab dari dokumen tersebut beserta sitasi.",
          "Jawaban dihasilkan secara otomatis dan bisa tidak lengkap atau keliru. Selalu verifikasi informasi penting dengan kutipan sumber yang dirujuk.",
        ],
      },
      {
        heading: "2. Akun Anda",
        body: [
          "Jaga kerahasiaan kata sandi dan gunakan kata sandi yang unik. Anda bertanggung jawab atas aktivitas di akun Anda.",
          "Profil demo adalah sandbox untuk evaluasi; jangan unggah data rahasia ke dalamnya.",
        ],
      },
      {
        heading: "3. Konten Anda",
        body: [
          "Anda tetap memiliki dokumen yang Anda unggah. Anda menyatakan berhak mengunggah dan memprosesnya, termasuk melalui penyedia AI yang dikonfigurasi.",
          "Jangan unggah malware, konten melanggar hukum, atau data pribadi yang tidak boleh Anda proses.",
        ],
      },
      {
        heading: "4. Penggunaan yang wajar dan batasan",
        body: [
          "Setiap paket memiliki batas permintaan, jumlah dokumen, dan ukuran file. Jangan mencoba melewati rate limit, mengakses data pengguna lain, atau mengganggu layanan.",
          "Saat memakai API key sendiri (BYOK), penggunaan ditagih oleh penyedia Anda sesuai perjanjian Anda dengan mereka.",
        ],
      },
      {
        heading: "5. Ketersediaan dan perubahan",
        body: [
          "Layanan disediakan apa adanya tanpa jaminan. Operator dapat mengubah, menangguhkan, atau menghentikan layanan dan ketentuan ini; perubahan penting sebaiknya diumumkan terlebih dahulu.",
        ],
      },
      {
        heading: "6. Kontak",
        body: ["Tambahkan nama badan hukum operator, hukum yang berlaku, dan alamat kontak di sini sebelum digunakan di produksi."],
      },
    ],
  },
};

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { t, locale } = useLanguage();
  const content = (kind === "privacy" ? PRIVACY : TERMS)[locale] ?? PRIVACY.en;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <CortexLogo size={30} />
          <span>{t.common.brand}</span>
        </Link>
        <LanguageSwitcher variant="pill" />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <h1 className="text-2xl font-bold sm:text-3xl">{content.title}</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {t.legal.lastUpdated}: {LAST_UPDATED}
        </p>
        <p
          role="note"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {t.legal.templateNotice}
        </p>
        <p className="mt-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{content.intro}</p>
        {content.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {section.body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
        <nav className="mt-12 flex gap-4 text-sm text-emerald-700 dark:text-emerald-400">
          <Link href="/">{t.errorsPage.home}</Link>
          <Link href={kind === "privacy" ? "/terms" : "/privacy"}>
            {kind === "privacy" ? t.legal.terms : t.legal.privacy}
          </Link>
        </nav>
      </main>
    </div>
  );
}
