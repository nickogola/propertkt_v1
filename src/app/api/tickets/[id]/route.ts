import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";

const adminUpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  adminNotes: z.string().max(4000).optional().nullable(),
});

const tenantUpdateSchema = z
  .object({
    category: z.enum(["Plumbing", "Appliance", "HVAC", "Electrical", "Pest", "Other"]),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(4000),
    urgency: z.enum(["low", "normal", "high", "emergency"]),
    preferredTiming: z.enum(["asap", "scheduled"]),
    preferredAt: z.string().datetime().nullable().optional(),
  })
  .refine((d) => d.preferredTiming !== "scheduled" || !!d.preferredAt, {
    message: "Please choose a preferred date and time.",
    path: ["preferredAt"],
  });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (session.role === "admin") {
    const parsed = adminUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const ticket = await db.ticket.update({
      where: { id },
      data: parsed.data,
      include: { tenant: true },
    });

    if (parsed.data.status) {
      await sendEmail({
        to: ticket.tenant.email,
        subject: `Update on your ticket: ${ticket.title}`,
        text: `Your ticket status is now: ${parsed.data.status.replace("_", " ")}.\n\n${ticket.adminNotes ? `Note from landlord:\n${ticket.adminNotes}\n\n` : ""}— Sent via ProperTkt`,
      });
    }

    return NextResponse.json({ ticket });
  }

  if (session.role === "tenant") {
    const existing = await db.ticket.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body?.action === "close") {
      if (existing.status === "closed" || existing.status === "resolved") {
        return NextResponse.json({ error: "Ticket is already closed." }, { status: 409 });
      }
      const ticket = await db.ticket.update({
        where: { id },
        data: { status: "closed" },
        include: { contractor: { select: { name: true, company: true } } },
      });
      return NextResponse.json({ ticket });
    }

    if (existing.status !== "open" || existing.assignmentStatus !== "unassigned") {
      return NextResponse.json({ error: "Ticket can no longer be edited." }, { status: 409 });
    }

    const parsed = tenantUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
    }

    const { preferredTiming, preferredAt } = parsed.data;
    const ticket = await db.ticket.update({
      where: { id },
      data: {
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        urgency: parsed.data.urgency,
        preferredTiming,
        preferredAt: preferredTiming === "scheduled" && preferredAt ? new Date(preferredAt) : null,
      },
      include: { contractor: { select: { name: true, company: true } } },
    });

    return NextResponse.json({ ticket });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "tenant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.ticket.findUnique({ where: { id } });
  if (!existing || existing.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "open" || existing.assignmentStatus !== "unassigned") {
    return NextResponse.json({ error: "Cannot delete a ticket once work has started." }, { status: 409 });
  }

  await db.ticket.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
