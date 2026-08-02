import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

// Contractor: pick up a job. Only one contractor can win a ticket; the update
// is guarded by `contractorId: null` so concurrent accepts can't double-book.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "contractor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contractor = await db.contractor.findUnique({ where: { id: session.contractorId } });
  if (!contractor || !contractor.active) {
    return NextResponse.json({ error: "Account not available." }, { status: 403 });
  }

  // Must have been offered this ticket.
  const offer = await db.ticketOffer.findUnique({
    where: { ticketId_contractorId: { ticketId: params.id, contractorId: contractor.id } },
  });
  if (!offer) {
    return NextResponse.json({ error: "This job isn't available to you." }, { status: 403 });
  }

  // Atomic claim: only succeeds if no contractor has taken it yet.
  const claim = await db.ticket.updateMany({
    where: { id: params.id, contractorId: null },
    data: {
      contractorId: contractor.id,
      assignmentStatus: "accepted",
      status: "in_progress",
      assignedAt: new Date(),
    },
  });

  if (claim.count === 0) {
    return NextResponse.json(
      { error: "Sorry, another contractor already picked up this job." },
      { status: 409 },
    );
  }

  const ticket = await db.ticket.findUnique({
    where: { id: params.id },
    include: { tenant: true },
  });

  // Notify the tenant that a contractor is now assigned.
  if (ticket) {
    const name = contractor.company ? `${contractor.name} (${contractor.company})` : contractor.name;
    const body =
      `Good news — a contractor has been assigned to your request "${ticket.title}".\n\n` +
      `Assigned to: ${name}\n` +
      `They'll share an estimated arrival time shortly.\n\n— Sent via ProperTkt`;
    await sendEmail({ to: ticket.tenant.email, subject: `Contractor assigned: ${ticket.title}`, text: body });
    if (ticket.tenant.phone) await sendWhatsApp({ to: ticket.tenant.phone, body });
  }

  return NextResponse.json({ ok: true });
}
