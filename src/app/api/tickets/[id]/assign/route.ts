import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

const bodySchema = z.object({
  // When provided, assign this specific contractor directly (no bidding).
  contractorId: z.string().min(1).optional(),
});

// Admin: either directly assign a chosen contractor, or offer the ticket to
// all matching contractors and let the first one accept it.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const ticket = await db.ticket.findUnique({
    where: { id: params.id },
    include: { tenant: { select: { unit: true } } },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }
  if (ticket.contractorId) {
    return NextResponse.json({ error: "A contractor is already assigned to this job." }, { status: 409 });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  // ----- Direct assignment to a specific contractor -----
  if (parsed.data.contractorId) {
    const contractor = await db.contractor.findUnique({ where: { id: parsed.data.contractorId } });
    if (!contractor || !contractor.active) {
      return NextResponse.json({ error: "That contractor isn't available." }, { status: 422 });
    }

    const claim = await db.ticket.updateMany({
      where: { id: ticket.id, contractorId: null },
      data: {
        contractorId: contractor.id,
        assignmentStatus: "accepted",
        status: "in_progress",
        assignedAt: new Date(),
      },
    });
    if (claim.count === 0) {
      return NextResponse.json({ error: "A contractor is already assigned to this job." }, { status: 409 });
    }

    // Record the offer for consistency (idempotent).
    await db.ticketOffer.upsert({
      where: { ticketId_contractorId: { ticketId: ticket.id, contractorId: contractor.id } },
      create: { ticketId: ticket.id, contractorId: contractor.id },
      update: {},
    });

    const full = await db.ticket.findUnique({ where: { id: ticket.id }, include: { tenant: true } });

    // Notify the assigned contractor.
    const cBody =
      `You've been assigned a job: ${ticket.title} (${ticket.category}, ${ticket.urgency}).\n` +
      `Unit ${ticket.tenant.unit}.\n\n${ticket.description}\n\n` +
      `Sign in to share your arrival time and progress:\n${appUrl}/contractor`;
    await sendEmail({ to: contractor.email, subject: `You've been assigned: ${ticket.title}`, text: cBody });
    if (contractor.phone) await sendWhatsApp({ to: contractor.phone, body: cBody });

    // Notify the tenant.
    if (full) {
      const name = contractor.company ? `${contractor.name} (${contractor.company})` : contractor.name;
      const tBody =
        `Good news — a contractor has been assigned to your request "${ticket.title}".\n\n` +
        `Assigned to: ${name}\nThey'll share an estimated arrival time shortly.\n\n— Sent via ProperTkt`;
      await sendEmail({ to: full.tenant.email, subject: `Contractor assigned: ${ticket.title}`, text: tBody });
      if (full.tenant.phone) await sendWhatsApp({ to: full.tenant.phone, body: tBody });
    }

    return NextResponse.json({ ok: true, assigned: contractor.id });
  }

  // ----- Broadcast: offer to matching contractors -----
  const contractors = await db.contractor.findMany({ where: { active: true } });

  // Prefer contractors whose trades include this category; fall back to all.
  const matching = contractors.filter((c) => {
    try {
      const trades = JSON.parse(c.trades) as string[];
      return Array.isArray(trades) && trades.includes(ticket.category);
    } catch {
      return false;
    }
  });
  const recipients = matching.length > 0 ? matching : contractors;

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No contractors are signed up yet. Ask contractors to create an account first." },
      { status: 422 },
    );
  }

  // Create offers (idempotent via unique [ticketId, contractorId]).
  await db.$transaction([
    db.ticketOffer.createMany({
      data: recipients.map((c) => ({ ticketId: ticket.id, contractorId: c.id })),
    }),
    db.ticket.update({
      where: { id: ticket.id },
      data: { assignmentStatus: "offered" },
    }),
  ]);

  await Promise.all(
    recipients.map(async (c) => {
      const body =
        `New job available: ${ticket.title} (${ticket.category}, ${ticket.urgency}).\n` +
        `Unit ${ticket.tenant.unit}.\n\n${ticket.description}\n\n` +
        `Sign in to accept it before someone else does:\n${appUrl}/contractor`;
      await sendEmail({
        to: c.email,
        subject: `New job available: ${ticket.title}`,
        text: body,
      });
      if (c.phone) {
        await sendWhatsApp({ to: c.phone, body });
      }
    }),
  );

  return NextResponse.json({ ok: true, offered: recipients.length });
}
