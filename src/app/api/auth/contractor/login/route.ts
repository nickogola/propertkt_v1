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
  const contractor = await db.contractor.findUnique({ where: { email } });

  if (!contractor || !verifyPassword(parsed.data.password, contractor.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (!contractor.active) {
    return NextResponse.json({ error: "This account has been deactivated." }, { status: 403 });
  }

  await setSessionCookie({ role: "contractor", contractorId: contractor.id, email: contractor.email });
  return NextResponse.json({ ok: true });
}
