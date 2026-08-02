import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { assignmentLabel, formatDuration } from "@/lib/assignment-ui";

const schema = z.object({
  assignmentStatus: z.enum(["accepted", "en_route", "on_site", "completed"]).optional(),
  etaAt: z.string().datetime().nullable().optional(),
  estimatedDurationMins: z.number().int().min(0).max(60 * 24 * 14).nullable().optional(),
  contractorNotes: z.string().max(2000).nullable().optional(),
});

// Contractor: update progress on their assigned job. Every change is pushed to
// the tenant by email/WhatsApp, and the tenant portal polls for live updates.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const existing = await db.ticket.findUnique({ where: { id: params.id } });
  if (!existing || existing.contractorId !== session.contractorId) {
    return NextResponse.json({ error: "This isn't your job." }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.assignmentStatus !== undefined) data.assignmentStatus = parsed.data.assignmentStatus;
  if (parsed.data.etaAt !== undefined) data.etaAt = parsed.data.etaAt ? new Date(parsed.data.etaAt) : null;
  if (parsed.data.estimatedDurationMins !== undefined) data.estimatedDurationMins = parsed.data.estimatedDurationMins;
  if (parsed.data.contractorNotes !== undefined) data.contractorNotes = parsed.data.contractorNotes;

  // When the contractor marks the work complete, resolve the ticket too.
  if (parsed.data.assignmentStatus === "completed") {
    data.status = "resolved";
  }

  const ticket = await db.ticket.update({
    where: { id: params.id },
    data,
    include: { tenant: true, contractor: true },
  });

  // Build a tenant-facing update message.
  const parts: string[] = [`Update on your request "${ticket.title}":`];
  parts.push(`Status: ${assignmentLabel(ticket.assignmentStatus)}`);
  if (ticket.etaAt) parts.push(`Estimated arrival: ${new Date(ticket.etaAt).toLocaleString()}`);
  const dur = formatDuration(ticket.estimatedDurationMins);
  if (dur) parts.push(`Estimated time on site: ${dur}`);
  if (ticket.contractorNotes) parts.push(`Note: ${ticket.contractorNotes}`);
  parts.push("\n— Sent via ProperTkt");
  const body = parts.join("\n");

  await sendEmail({
    to: ticket.tenant.email,
    subject: `Update on your request: ${ticket.title}`,
    text: body,
  });
  if (ticket.tenant.phone) await sendWhatsApp({ to: ticket.tenant.phone, body });

  return NextResponse.json({ ok: true });
}
