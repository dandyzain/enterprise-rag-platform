import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/ingest";
import { z } from "zod";

export const maxDuration = 60; // Allow sufficient time for large document parsing and embeddings

const IngestFormSchema = z.object({
  knowledgeBaseId: z.string().min(1, "Knowledge Base ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawKbId = formData.get("knowledgeBaseId") as string | null;

    const validation = IngestFormSchema.safeParse({
      knowledgeBaseId: rawKbId || "default-kb-1",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi parameter gagal",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "File wajib dilampirkan dalam format multipart/form-data (field: 'file').",
        },
        { status: 400 }
      );
    }

    // Validate file type
    const validExtensions = [".pdf", ".txt", ".md", ".json", ".csv"];
    const isExtensionValid = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isExtensionValid && !file.type.includes("pdf") && !file.type.includes("text")) {
      return NextResponse.json(
        {
          success: false,
          error: `Tipe file tidak didukung. Harap unggah format PDF, TXT, MD, atau CSV. Diterima: ${file.type || file.name}`,
        },
        { status: 400 }
      );
    }

    // Limit maximum size to 25MB
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Ukuran file melebihi batas maksimum 25MB.",
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await ingestDocument({
      knowledgeBaseId: validation.data.knowledgeBaseId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      fileBuffer: buffer,
      fileSize: file.size,
    });

    return NextResponse.json(
      {
        success: true,
        message: `File "${file.name}" berhasil dianalisis, dipecah menjadi ${result.totalChunks} chunks, dan diindeks ke dalam vector store.`,
        data: result,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[API Ingest] Terjadi kesalahan fatal:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memproses dan mengindeks dokumen.",
      },
      { status: 500 }
    );
  }
}
