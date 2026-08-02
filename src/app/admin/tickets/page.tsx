import { db } from "@/lib/db";
import TicketsClient from "./tickets-client";

export const dynamic = "force-dynamic";

function parseTrades(json: string): string[] {
  try {
    const t = JSON.parse(json);
    return Array.isArray(t) ? t : [];
  } catch {
    return [];
  }
}

export default async function AdminTicketsPage() {
  const [tickets, contractors] = await Promise.all([
    db.ticket.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        tenant: { select: { name: true, unit: true, email: true } },
        contractor: { select: { name: true, company: true, phone: true } },
      },
    }),
    db.contractor.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <TicketsClient
      initialTickets={tickets.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        urgency: t.urgency,
        status: t.status,
        adminNotes: t.adminNotes,
        createdAt: t.createdAt.toISOString(),
        preferredTiming: t.preferredTiming,
        preferredAt: t.preferredAt ? t.preferredAt.toISOString() : null,
        tenant: t.tenant,
        assignmentStatus: t.assignmentStatus,
        contractorId: t.contractorId,
        contractor: t.contractor,
        etaAt: t.etaAt ? t.etaAt.toISOString() : null,
        estimatedDurationMins: t.estimatedDurationMins,
        contractorNotes: t.contractorNotes,
      }))}
      contractors={contractors.map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        trades: parseTrades(c.trades),
      }))}
    />
  );
}
