import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import ContractorClient, { type ContractorTicket } from "./contractor-client";

export const dynamic = "force-dynamic";

export default async function ContractorDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "contractor") return null;

  const [available, mine] = await Promise.all([
    db.ticket.findMany({
      where: {
        contractorId: null,
        assignmentStatus: "offered",
        offers: { some: { contractorId: session.contractorId } },
      },
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { unit: true } } },
    }),
    db.ticket.findMany({
      where: { contractorId: session.contractorId },
      orderBy: { updatedAt: "desc" },
      include: { tenant: { select: { name: true, unit: true, phone: true } } },
    }),
  ]);

  const serializeAvailable = (t: (typeof available)[number]): ContractorTicket => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    urgency: t.urgency,
    assignmentStatus: t.assignmentStatus,
    etaAt: t.etaAt ? t.etaAt.toISOString() : null,
    estimatedDurationMins: t.estimatedDurationMins,
    contractorNotes: t.contractorNotes,
    createdAt: t.createdAt.toISOString(),
    preferredTiming: t.preferredTiming,
    preferredAt: t.preferredAt ? t.preferredAt.toISOString() : null,
    // Available jobs hide tenant identity until claimed.
    tenant: { name: null, unit: t.tenant.unit, phone: null },
  });

  const serializeMine = (t: (typeof mine)[number]): ContractorTicket => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    urgency: t.urgency,
    assignmentStatus: t.assignmentStatus,
    etaAt: t.etaAt ? t.etaAt.toISOString() : null,
    estimatedDurationMins: t.estimatedDurationMins,
    contractorNotes: t.contractorNotes,
    createdAt: t.createdAt.toISOString(),
    preferredTiming: t.preferredTiming,
    preferredAt: t.preferredAt ? t.preferredAt.toISOString() : null,
    tenant: { name: t.tenant.name, unit: t.tenant.unit, phone: t.tenant.phone },
  });

  return (
    <ContractorClient
      initialAvailable={available.map(serializeAvailable)}
      initialMine={mine.map(serializeMine)}
    />
  );
}
