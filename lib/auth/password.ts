import crypto from "crypto";

/**
 * Password hashing with Node's built-in scrypt (memory-hard KDF).
 * Stored format: scrypt$<N>$<r>$<p>$<saltB64url>$<hashB64url>
 */

const KEY_LENGTH = 64;
const DEFAULT_PARAMS = { N: 16384, r: 8, p: 1 };
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

function scryptAsync(
  password: string,
  salt: Buffer,
  params: { N: number; r: number; p: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_LENGTH,
      { N: params.N, r: params.r, p: params.p, maxmem: 64 * 1024 * 1024 },
      (err, derived) => (err ? reject(err) : resolve(derived))
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password, salt, DEFAULT_PARAMS);
  const { N, r, p } = DEFAULT_PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const params = { N: Number(nStr), r: Number(rStr), p: Number(pStr) };
  if (!Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) {
    return false;
  }
  const expected = Buffer.from(hashB64, "base64url");
  const derived = await scryptAsync(password, Buffer.from(saltB64, "base64url"), params);
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

/**
 * A fixed hash used to keep sign-in timing constant when the e-mail does not exist.
 * Generated lazily so module import stays cheap.
 */
let dummyHash: Promise<string> | null = null;
export function getDummyPasswordHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword(crypto.randomBytes(16).toString("hex"));
  return dummyHash;
}
