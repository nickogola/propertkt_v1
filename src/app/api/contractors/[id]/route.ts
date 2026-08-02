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

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  company: z.string().max(120).optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional().nullable(),
  password: z.string().min(8).max(200).optional(),
  trades: z.array(z.enum(CATEGORIES)).min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.company !== undefined) data.company = parsed.data.company;
  if (parsed.data.email !== undefined) data.email = parsed.data.email.toLowerCase();
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
  if (parsed.data.password !== undefined) data.passwordHash = hashPassword(parsed.data.password);
  if (parsed.data.trades !== undefined) data.trades = JSON.stringify(parsed.data.trades);
  if (parsed.data.active !== undefined) data.active = parsed.data.active;

  const contractor = await db.contractor.update({ where: { id: params.id }, data });
  return NextResponse.json({ contractor });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.contractor.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
