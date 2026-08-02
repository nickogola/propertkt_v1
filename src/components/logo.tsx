import Link from "next/link";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="ptk-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect x="2" y="6" width="28" height="20" rx="5" fill="url(#ptk-grad)" />
      <circle cx="2" cy="16" r="2.5" fill="#f8fafc" />
      <circle cx="30" cy="16" r="2.5" fill="#f8fafc" />
      <path d="M11 12.5l3 3 7-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-7 w-7";
  const text = size === "lg" ? "text-2xl" : "text-lg";
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight text-slate-900">
      <LogoMark className={dims} />
      <span className={text}>
        Proper<span className="text-brand-600">Tkt</span>
      </span>
    </Link>
  );
}
