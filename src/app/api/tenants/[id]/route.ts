import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  unit: z.string().min(1).max(40).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional().nullable(),
  password: z.string().min(8).max(200).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.unit !== undefined) data.unit = parsed.data.unit;
  if (parsed.data.email !== undefined) data.email = parsed.data.email.toLowerCase();
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
  if (parsed.data.password !== undefined) data.passwordHash = hashPassword(parsed.data.password);

  const tenant = await db.tenant.update({ where: { id: params.id }, data });
  return NextResponse.json({ tenant });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.tenant.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
