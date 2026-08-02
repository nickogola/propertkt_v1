import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pm_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Session =
  | { role: "admin"; email: string }
  | { role: "tenant"; tenantId: string; email: string }
  | { role: "contractor"; contractorId: string; email: string };

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 chars. See .env.example.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(getSecret());
}

export async function readSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role === "admin" && typeof payload.email === "string") {
      return { role: "admin", email: payload.email };
    }
    if (
      payload.role === "tenant" &&
      typeof payload.tenantId === "string" &&
      typeof payload.email === "string"
    ) {
      return { role: "tenant", tenantId: payload.tenantId, email: payload.email };
    }
    if (
      payload.role === "contractor" &&
      typeof payload.contractorId === "string" &&
      typeof payload.email === "string"
    ) {
      return { role: "contractor", contractorId: payload.contractorId, email: payload.email };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: Session): Promise<void> {
  const token = await createSession(session);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  return readSession(token);
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
