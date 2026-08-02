import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const tenant = await db.tenant.findUnique({ where: { email } });

  // Same generic message either way so we don't reveal which emails are tenants.
  if (!tenant || !verifyPassword(parsed.data.password, tenant.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await setSessionCookie({ role: "tenant", tenantId: tenant.id, email: tenant.email });
  return NextResponse.json({ ok: true });
}
