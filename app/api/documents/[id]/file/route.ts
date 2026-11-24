import { db } from "@/lib/db";
import { apiRoute, ApiError } from "@/lib/api/route";
import { loadReadableDocument } from "@/lib/api/access";
import { sanitizeFilename } from "@/lib/rag/file-types";

/** Download the original uploaded file. Always served as an attachment with a locked-down CSP. */
export const GET = apiRoute<{ id: string }>(async (ctx) => {
  const { document } = await loadReadableDocument(ctx.actor, ctx.params.id);
  const file = await db.getDocumentFile(document.id);
  if (!file) throw new ApiError("NO_ORIGINAL_FILE", 404);

  const filename = sanitizeFilename(document.title);
  const asciiName = filename.replace(/[^\x20-\x7e]/g, "_");
  return new Response(new Uint8Array(file.buffer), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType === "application/pdf" ? "application/pdf" : "application/octet-stream",
      "Content-Length": String(file.buffer.length),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
});
