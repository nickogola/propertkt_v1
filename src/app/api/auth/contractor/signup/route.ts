import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { CATEGORIES } from "@/lib/ticket-ui";

const schema = z.object({
  name: z.string().min(1).max(120),
  company: z.string().max(120).optional().nullable(),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  trades: z.array(z.enum(CATEGORIES)).min(1, "Pick at least one trade."),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.contractor.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists. Try signing in." },
      { status: 409 },
    );
  }

  const contractor = await db.contractor.create({
    data: {
      name: parsed.data.name,
      company: parsed.data.company ?? null,
      email,
      phone: parsed.data.phone ?? null,
      trades: JSON.stringify(parsed.data.trades),
      passwordHash: hashPassword(parsed.data.password),
    },
  });

  await setSessionCookie({ role: "contractor", contractorId: contractor.id, email: contractor.email });
  return NextResponse.json({ ok: true });
}
