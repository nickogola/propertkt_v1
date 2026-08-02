import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { CATEGORIES } from "@/lib/ticket-ui";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  company: z.string().max(120).optional().nullable(),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  password: z.string().min(8).max(200),
  trades: z.array(z.enum(CATEGORIES)).min(1),
});

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contractors = await db.contractor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tickets: true } } },
  });
  return NextResponse.json({ contractors });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.contractor.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A contractor with that email already exists." }, { status: 409 });
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
  return NextResponse.json({ contractor });
}
