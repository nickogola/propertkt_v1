import { NextResponse } from "next/server";
import { z } from "zod";
import { adminEmail, verifyAdminPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  if (email.toLowerCase() !== adminEmail().toLowerCase() || !verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await setSessionCookie({ role: "admin", email: adminEmail() });
  return NextResponse.json({ ok: true });
}
