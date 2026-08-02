import { db } from "@/lib/db";
import TenantsClient from "./tenants-client";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const tenants = await db.tenant.findMany({
    orderBy: { unit: "asc" },
    include: { _count: { select: { tickets: true } } },
  });

  return (
    <TenantsClient
      initialTenants={tenants.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        unit: t.unit,
        notes: t.notes,
        ticketCount: t._count.tickets,
        hasPassword: Boolean(t.passwordHash),
      }))}
    />
  );
}
