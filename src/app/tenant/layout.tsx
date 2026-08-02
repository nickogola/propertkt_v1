import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { TopNav, BottomNav, type NavLink } from "@/components/portal-nav";

const LINKS: NavLink[] = [
  { href: "/tenant/new", label: "New ticket", icon: "plus" },
  { href: "/tenant/tickets", label: "My tickets", icon: "ticket" },
];

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const tenant =
    session && session.role === "tenant"
      ? await db.tenant.findUnique({ where: { id: session.tenantId } })
      : null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-6">
            <Logo size="md" />
            {tenant && <TopNav links={LINKS} />}
          </div>
          {tenant && (
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Unit {tenant.unit} · {tenant.name}
              </span>
              <LogoutButton />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-6 pb-24 md:pb-8">{children}</main>
      {tenant && <BottomNav links={LINKS} />}
    </div>
  );
}
