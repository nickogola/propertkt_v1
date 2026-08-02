import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  unit: z.string().min(1).max(40),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  password: z.string().min(8).max(200),
});

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenants = await db.tenant.findMany({
    orderBy: { unit: "asc" },
    include: { _count: { select: { tickets: true } } },
  });
  return NextResponse.json({ tenants });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.tenant.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A tenant with that email already exists." }, { status: 409 });
  }

  const tenant = await db.tenant.create({
    data: {
      name: parsed.data.name,
      unit: parsed.data.unit,
      email,
      phone: parsed.data.phone ?? null,
      passwordHash: hashPassword(parsed.data.password),
    },
  });
  return NextResponse.json({ tenant });
}
