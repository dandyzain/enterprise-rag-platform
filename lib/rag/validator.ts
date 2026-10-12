export interface FileValidationResult {
  valid: boolean;
  detectedMime: string;
  error?: string;
}

/**
 * Validate binary file magic numbers to prevent polyglot executables and disguised malware.
 */
export function validateBinaryFile(buffer: Buffer, declaredMimeType: string): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, detectedMime: "unknown", error: "Berkas kosong." };
  }

  // Check for executable binary headers (MZ header for .exe, ELF for Linux binary)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return {
      valid: false,
      detectedMime: "application/x-dosexec",
      error: "Keamanan: Berkas executable Windows (EXE/DLL) dilarang untuk diunggah.",
    };
  }

  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return {
      valid: false,
      detectedMime: "application/x-elf",
      error: "Keamanan: Berkas biner Linux ELF dilarang untuk diunggah.",
    };
  }

  // Validate PDF magic bytes (%PDF- => 0x25, 0x50, 0x44, 0x46)
  if (declaredMimeType.includes("pdf") || declaredMimeType === "application/pdf") {
    const isPdf =
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;

    if (!isPdf) {
      return {
        valid: false,
        detectedMime: "invalid/corrupted",
        error: "Keamanan: Berkas tidak memiliki struktur tanda biner PDF yang valid (%PDF-).",
      };
    }

    return { valid: true, detectedMime: "application/pdf" };
  }

  return { valid: true, detectedMime: declaredMimeType };
}
