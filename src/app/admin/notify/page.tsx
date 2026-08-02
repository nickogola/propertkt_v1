import { db } from "@/lib/db";
import NotifyClient from "./notify-client";

export const dynamic = "force-dynamic";

export default async function NotifyPage() {
  const tenants = await db.tenant.findMany({
    orderBy: { unit: "asc" },
    select: { id: true, name: true, unit: true, email: true, phone: true },
  });
  return <NotifyClient tenants={tenants} />;
}
