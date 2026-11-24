/** Supported upload formats. The MIME type is derived from the extension, never trusted from the client. */
export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
};

export function resolveUploadMimeType(filename: string): string | null {
  const lower = filename.toLowerCase();
  const ext = Object.keys(ALLOWED_UPLOAD_TYPES).find((e) => lower.endsWith(e));
  return ext ? ALLOWED_UPLOAD_TYPES[ext] : null;
}

/** Strip path components and control characters from an uploaded file name. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() || "document";
  return base.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 200) || "document";
}
