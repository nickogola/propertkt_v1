import LogoutButton from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { TopNav, BottomNav, type NavLink } from "@/components/portal-nav";
import { getSession } from "@/lib/session";

const LINKS: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: "grid", exact: true },
  { href: "/admin/tenants", label: "Tenants", icon: "users" },
  { href: "/admin/tickets", label: "Tickets", icon: "ticket" },
  { href: "/admin/contractors", label: "Contractors", icon: "hard-hat" },
  { href: "/admin/notify", label: "Notices", icon: "megaphone" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-6">
            <Logo size="md" />
            {isAdmin && <TopNav links={LINKS} />}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Admin
              </span>
              <LogoutButton />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6 pb-24 md:pb-8">{children}</main>
      {isAdmin && <BottomNav links={LINKS} />}
    </div>
  );
}
