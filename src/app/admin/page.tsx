import Link from "next/link";
import { db } from "@/lib/db";
import { statusLabel, statusClass, urgencyClass, urgencyLabel } from "@/lib/ticket-ui";
import { CategoryIcon, Icon, type IconName } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [tenantCount, totalTickets, openTickets, recentTickets] = await Promise.all([
    db.tenant.count(),
    db.ticket.count(),
    db.ticket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    db.ticket.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { tenant: { select: { name: true, unit: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">A quick snapshot of your property.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Tenants" value={tenantCount} href="/admin/tenants" icon="users" accent="bg-brand-50 text-brand-600" />
        <Stat label="Open tickets" value={openTickets} href="/admin/tickets" icon="ticket" accent={openTickets > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"} />
        <Stat label="Total tickets" value={totalTickets} href="/admin/tickets" icon="clipboard" accent="bg-slate-100 text-slate-600" />
      </div>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">Recent tickets</h2>
          <Link href="/admin/tickets" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            View all <Icon name="arrow-right" className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentTickets.length === 0 ? (
          <div className="card mt-3 p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Icon name="ticket" className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-700">No tickets yet</p>
            <p className="mt-1 text-xs text-slate-500">When a tenant submits one, it&apos;ll appear here.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentTickets.map((t) => (
              <li key={t.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <CategoryIcon category={t.category} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium leading-tight">{t.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Unit {t.tenant.unit} · {t.tenant.name} · {new Date(t.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`pill ${urgencyClass(t.urgency)}`}>{urgencyLabel(t.urgency)}</span>
                  <span className={`pill ${statusClass(t.status)}`}>{statusLabel(t.status)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="section-title">Quick actions</h2>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <Link href="/admin/tenants" className="btn-secondary justify-start sm:justify-center">
            <Icon name="plus" className="h-4 w-4" /> Add tenant
          </Link>
          <Link href="/admin/notify" className="btn-secondary justify-start sm:justify-center">
            <Icon name="megaphone" className="h-4 w-4" /> Send notice
          </Link>
          <Link href="/admin/tickets" className="btn-secondary justify-start sm:justify-center">
            <Icon name="ticket" className="h-4 w-4" /> Review tickets
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, href, icon, accent }: { label: string; value: number | string; href: string; icon: IconName; accent: string }) {
  return (
    <Link href={href} className="card card-hover flex items-center gap-4 p-4 sm:p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</p>
      </div>
    </Link>
  );
}
