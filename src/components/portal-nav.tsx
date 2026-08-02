"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

export type NavLink = { href: string; label: string; icon: IconName; exact?: boolean };

function useIsActive() {
  const pathname = usePathname();
  return (l: NavLink) =>
    l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(l.href + "/");
}

/** Desktop top navigation — hidden on small screens. */
export function TopNav({ links }: { links: NavLink[] }) {
  const isActive = useIsActive();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={isActive(l) ? "nav-link-active" : "nav-link"}>
          <Icon name={l.icon} className="h-4 w-4" />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** App-style bottom tab bar — mobile only. */
export function BottomNav({ links }: { links: NavLink[] }) {
  const isActive = useIsActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
      >
        {links.map((l) => {
          const active = isActive(l);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-0.5 py-2 pt-2.5 text-[11px] font-medium transition ${
                active ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon name={l.icon} className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
