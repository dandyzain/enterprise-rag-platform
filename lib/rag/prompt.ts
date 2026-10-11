import { SearchResultChunk } from "./types";

export interface GroundedPromptPayload {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Builds the strict enterprise grounding system prompt and context payload.
 */
export function buildStrictGroundingPrompt(
  query: string,
  chunks: SearchResultChunk[]
): GroundedPromptPayload {
  if (chunks.length === 0) {
    return {
      systemPrompt: `Anda adalah Enterprise Knowledge Assistant yang beroperasi dengan prinsip Strict Grounding (nol halusinasi).
ATURAN UTAMA:
1. Tidak ada konteks dokumen yang relevan ditemukan untuk pertanyaan ini.
2. Anda WAJIB menolak menjawab atau berspekulasi. Nyatakan secara sopan dan tegas bahwa informasi tidak ditemukan dalam Knowledge Base saat ini.
3. Sarankan pengguna untuk mengunggah dokumen PDF atau teks terkait ke Knowledge Base.`,
      userPrompt: query,
    };
  }

  // Format context references with clear citation numbers
  const formattedContext = chunks
    .map((chunk, index) => {
      const citeNum = index + 1;
      const pageInfo = chunk.pageNumber ? `Halaman ${chunk.pageNumber}` : "Halaman N/A";
      return `[Referensi ${citeNum}] (Dokumen: "${chunk.documentTitle}" | ${pageInfo} | Chunk #${chunk.chunkIndex}):\n${chunk.content}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = `Anda adalah Enterprise Knowledge Assistant tingkat lanjut untuk sistem B2B Enterprise.
Tugas Anda adalah memberikan jawaban yang akurat, komprehensif, dan profesional HANYA berdasarkan konteks dokumen yang dilampirkan di bawah.

ATURAN KETAT (STRICT GROUNDING & CITATION RULES):
1. KEAKURATAN MUTLAK: Jawablah pertanyaan pengguna HANYA bersumber dari informasi yang tertulis secara eksplisit pada bagian [Konteks Referensi].
2. SITASI WAJIB: Setiap klaim, fakta, angka, atau pernyataan spesifik WAJIB menyertakan penanda sitasi di akhir kalimat atau klausa, misalnya [1], [2], atau [1][3].
3. LARANGAN SPEKULASI: Dilarang keras menggunakan pengetahuan umum di luar konteks, berasumsi, menyimpulkan hal yang tidak tercantum, atau berhalusinasi.
4. PENOLAKAN ANGGUN: Jika pertanyaan pengguna tidak dapat dijawab sepenuhnya dari referensi yang ada, jawab bagian yang tertera lalu nyatakan dengan jelas:
   "Informasi lebih lanjut mengenai hal tersebut tidak tercantum dalam dokumen yang tersedia di Knowledge Base."
5. GAYA KOMUNIKASI: Gunakan gaya bahasa enterprise yang terstruktur, padat, berwibawa, dan mudah dipahami. Gunakan format markdown (bullet points atau tabel ringkas jika sesuai).`;

  const userPrompt = `[Konteks Referensi]:
${formattedContext}

---

[Pertanyaan Pengguna]:
${query}

Mohon berikan jawaban yang komprehensif, terstruktur, dan tervalidasi dengan sitasi [n] sesuai aturan di atas.`;

  return {
    systemPrompt,
    userPrompt,
  };
}
