import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/logout-button";
import { Logo } from "@/components/logo";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const contractor =
    session && session.role === "contractor"
      ? await db.contractor.findUnique({ where: { id: session.contractorId } })
      : null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3">
          <Logo size="md" />
          {contractor && (
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {contractor.company ?? contractor.name}
              </span>
              <LogoutButton />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-6 pb-12">{children}</main>
    </div>
  );
}
