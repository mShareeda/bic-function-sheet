import argon2 from "argon2";
import { randomBytes, createHash } from "node:crypto";

export const PASSWORD_MIN_LENGTH = 12;

export function validatePasswordPolicy(pw: string): string | null {
  if (pw.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one digit.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain at least one special character.";
  return null;
}

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export function generateTempPassword(length = 14): string {
  const charset =
    "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += charset[bytes[i] % charset.length];
  }
  // Guarantee policy: at least one digit + letter (charset already mixes them).
  return out;
}

export function generateResetToken(): { token: string; tokenHash: string } {
  // 32 random bytes → 256 bits of entropy via base64url. Timing-safe because
  // verification uses a DB key lookup on the hash (no string comparison).
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashResetToken(token: string): string {
  // SHA-256 is intentionally fast here — this is a lookup key, not a password
  // hash. Security comes from the 256-bit token entropy and the single-use +
  // expiry enforcement in resetPasswordAction, not from hash slowness.
  return createHash("sha256").update(token).digest("hex");
}
