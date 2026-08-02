import { db } from "@/lib/db";
import ContractorsClient, { type AdminContractor } from "./contractors-client";

export const dynamic = "force-dynamic";

function parseTrades(json: string): string[] {
  try {
    const t = JSON.parse(json);
    return Array.isArray(t) ? t : [];
  } catch {
    return [];
  }
}

export default async function AdminContractorsPage() {
  const contractors = await db.contractor.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tickets: true } } },
  });

  const initialContractors: AdminContractor[] = contractors.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    trades: parseTrades(c.trades),
    active: c.active,
    ticketCount: c._count.tickets,
  }));

  return <ContractorsClient initialContractors={initialContractors} />;
}
