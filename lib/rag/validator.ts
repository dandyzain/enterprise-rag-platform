export interface FileValidationResult {
  valid: boolean;
  detectedMime: string;
  code?: "FILE_EMPTY" | "FILE_EXECUTABLE" | "FILE_NOT_PDF";
}

/**
 * Validate binary magic numbers to reject executables and disguised files.
 */
export function validateBinaryFile(buffer: Buffer, declaredMimeType: string): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, detectedMime: "unknown", code: "FILE_EMPTY" };
  }

  // Windows PE (MZ) and Linux ELF executables
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { valid: false, detectedMime: "application/x-dosexec", code: "FILE_EXECUTABLE" };
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return { valid: false, detectedMime: "application/x-elf", code: "FILE_EXECUTABLE" };
  }

  // PDF must start with %PDF
  if (declaredMimeType.includes("pdf")) {
    const isPdf =
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;
    return isPdf
      ? { valid: true, detectedMime: "application/pdf" }
      : { valid: false, detectedMime: "invalid/corrupted", code: "FILE_NOT_PDF" };
  }

  return { valid: true, detectedMime: declaredMimeType };
}
