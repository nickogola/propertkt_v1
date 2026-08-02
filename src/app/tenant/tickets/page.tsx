import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import TenantTicketsClient from "./tickets-client";

export const dynamic = "force-dynamic";

export default async function MyTicketsPage() {
  const session = await getSession();
  if (!session || session.role !== "tenant") return null;

  const tickets = await db.ticket.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    include: { contractor: { select: { name: true, company: true } } },
  });

  return (
    <TenantTicketsClient
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
        assignmentStatus: t.assignmentStatus,
        etaAt: t.etaAt ? t.etaAt.toISOString() : null,
        estimatedDurationMins: t.estimatedDurationMins,
        contractorNotes: t.contractorNotes,
        contractor: t.contractor,
      }))}
    />
  );
}
