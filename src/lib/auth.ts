import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "./db";

// ----- Tenant passwords (scrypt) -----

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(keyHex, "hex");
    const derived = scryptSync(password, salt, expected.length);
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

// ----- Admin password (env, plaintext compare in constant time) -----

export function verifyAdminPassword(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function adminEmail(): string {
  return process.env.ADMIN_EMAIL ?? "admin@localhost";
}

// ----- (legacy) magic link helpers, kept so any stragglers compile.
// Tenant flow is now password-based; these are unused but harmless.

export async function issueMagicLink(_email: string): Promise<{ token: string }> {
  throw new Error("Magic-link tenant login was removed. Use password login.");
}

export async function consumeMagicLink(_token: string): Promise<{ email: string } | null> {
  return null;
}
