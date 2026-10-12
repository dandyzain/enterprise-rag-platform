import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/ingest";

const SEED_DOCUMENTS = [
  {
    filename: "SOP-CLOUD-2026_Arsitektur_Infrastruktur_Enterprise.txt",
    mimeType: "text/plain",
    content: `# Standar Operasional Prosedur (SOP-CLOUD-2026): Arsitektur Infrastruktur Cloud Enterprise

## 1. Ringkasan Topologi Sistem & Komputasi
Infrastruktur backend perusahaan beroperasi pada arsitektur hybrid multi-region dengan klaster Kubernetes (EKS/GKE) versi 1.30. Setiap klaster didukung oleh node pool otomatis dengan arsitektur microservices terisolasi. Service mesh menggunakan Istio untuk mTLS inter-service communication dengan latensi jaringan internal maksimal 2.5 milidetik.

## 2. Arsitektur Basis Data & Mesin Vektor pgvector
Penyimpanan data relasional dan vektor menggunakan PostgreSQL 16 dengan ekstensi pgvector. Vektor embedding dihasilkan menggunakan model text-embedding-3-small (1536 dimensi) atau text-embedding-004 (768 dimensi). Indeks HNSW (Hierarchical Navigable Small World) diatur dengan m=16 dan ef_construction=64 untuk menjamin waktu pencarian vektor di bawah 10 milidetik pada dataset 5 juta entri.

## 3. High Availability & Service Level Agreement (SLA)
Sistem menjamin uptime availability sebesar 99.99% per kuartal. Failover otomatis antar region (Primary: Singapore ap-southeast-1, Secondary: Jakarta ap-southeast-3) menggunakan streaming replication berlatensi sinkronisasi di bawah 500 milidetik.`,
  },
  {
    filename: "SEC-POL-04_Kebijakan_Keamanan_Data_ISO27001.txt",
    mimeType: "text/plain",
    content: `# Kebijakan Tata Kelola Keamanan Informasi & Privasi Data (ISO-27001 / NIST-CSF)

## 1. Standar Enkripsi Data
Semua data perusahaan yang tersimpan dalam basis data vektor maupun media penyimpanan wajib dienkripsi saat diam (Data at Rest) menggunakan standar AES-256 GCM. Data dalam perjalanan (Data in Transit) wajib dilindungi oleh protokol TLS 1.3 dengan cipher suite ECDHE-RSA-AES256-GCM-SHA384.

## 2. Prinsip Hak Akses Minimal (Zero Trust & Least Privilege)
Setiap pengguna dan layanan internal diwajibkan menerapkan autentikasi berbasis RBAC (Role-Based Access Control) dan otorisasi multi-faktor (MFA FIDO2). Sesi akses administratif dibatasi maksimal 8 jam dengan audit logging tidak dapat diubah (immutable logs) yang dialirkan ke SIEM secara real-time.

## 3. Retensi & Penghapusan Data Terverifikasi
Dokumen yang dihapus oleh pengguna wajib mengalami *cryptographic erasure* dan penghapusan cascade pada seluruh chunk embedding di tabel basis data dalam waktu maksimal 60 detik sejak instruksi diterima.`,
  },
  {
    filename: "DEV-GUIDE-02_Standar_CI_CD_DevOps_Pipeline.txt",
    mimeType: "text/plain",
    content: `# Pedoman Pengembangan Perangkat Lunak & Otomasi CI/CD (DevOps-2026)

## 1. Standar Branching & Code Review
Seluruh rekayasa perangkat lunak mengadopsi model *Trunk-Based Development*. Setiap perubahan kode melalui Pull Request wajib mendapatkan persetujuan minimal 2 reviewer senior dan lolos verifikasi automated testing (coverage unit test minimum 85%).

## 2. Pipeline Deployment Otomatis (CI/CD)
Proses deployment memanfaatkan strategi Blue-Green Deployment dan Canary Rollout (10% -> 25% -> 50% -> 100%) dengan pemantauan otomatis tingkat kegagalan HTTP 5xx. Apabila rasio error melampaui 0.1% dalam kurun waktu 3 menit pertama, pipeline secara otomatis melakukan rollback ke versi stabil sebelumnya.

## 3. Observabilitas & Monitoring Real-Time
Metrik performa, tracing terdistribusi, dan logging dikumpulkan menggunakan OpenTelemetry Agent dan Prometheus. Peringatan latensi p99 di atas 200 milidetik akan secara otomatis memicu notifikasi prioritas tinggi ke kanal PagerDuty tim On-Call.`,
  },
];

export async function POST(req: NextRequest) {
  try {
    let kbId = "default-kb-1";
    try {
      const body = await req.json();
      if (body?.knowledgeBaseId) kbId = body.knowledgeBaseId;
      else if (body?.kbId) kbId = body.kbId;
    } catch {
      // Body may be empty if called with query parameter
      const { searchParams } = new URL(req.url);
      kbId = searchParams.get("kbId") || "default-kb-1";
    }

    const results = [];
    for (const doc of SEED_DOCUMENTS) {
      const buffer = Buffer.from(doc.content, "utf-8");
      const res = await ingestDocument({
        knowledgeBaseId: kbId,
        filename: doc.filename,
        mimeType: doc.mimeType,
        fileBuffer: buffer,
        fileSize: buffer.length,
      });
      results.push(res);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengindeks ${results.length} dokumen contoh enterprise ke Knowledge Base.`,
      data: results,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[API Seed] Error seeding documents:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat dokumen contoh." },
      { status: 500 }
    );
  }
}
