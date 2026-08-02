import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import NewTicketForm from "../new-ticket-form";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const session = await getSession();
  const openCount =
    session && session.role === "tenant"
      ? await db.ticket.count({
          where: { tenantId: session.tenantId, status: { in: ["open", "in_progress"] } },
        })
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Report a maintenance issue</h1>
          <p className="mt-1 text-sm text-slate-600">
            For life-threatening emergencies (gas, fire, major flooding) call 911 first.
          </p>
        </div>
        {openCount > 0 && (
          <Link
            href="/tenant/tickets"
            className="pill bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100"
          >
            {openCount} open ticket{openCount === 1 ? "" : "s"} <Icon name="arrow-right" className="h-3 w-3" />
          </Link>
        )}
      </div>

      <section className="card p-5 sm:p-6">
        <NewTicketForm />
      </section>
    </div>
  );
}
