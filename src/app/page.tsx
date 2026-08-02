import Link from "next/link";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icons";

export default function HomePage() {
  return (
    <main className="bg-marketing min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo size="md" />
        <div className="flex items-center gap-2 text-sm">
          <Link href="/tenant/login" className="btn-ghost">Tenant sign-in</Link>
          <Link href="/contractor/login" className="btn-ghost">Contractor</Link>
          <Link href="/admin/login" className="btn-secondary">Admin</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-14 pb-10 text-center sm:pt-20">
        <span className="pill bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
          For small landlords
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Tickets, tenants, and notices —
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent"> all in one place.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
          ProperTkt lets your tenants log maintenance issues from their phone, and lets you reply,
          update status, and send rent or trash-day reminders in seconds.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/tenant/login" className="btn-primary px-6">
            Open tenant portal <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          <Link href="/admin/login" className="btn-secondary px-6">Landlord admin</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-10 sm:grid-cols-2">
        <Link href="/tenant/login" className="card card-hover group p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-md shadow-brand-600/25">
              <Icon name="home" className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-semibold">I&apos;m a tenant</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Sign in with your email and password to report a maintenance issue or check the status of an open request.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition group-hover:gap-2">
            Get started <Icon name="arrow-right" className="h-4 w-4" />
          </span>
        </Link>

        <Link href="/admin/login" className="card card-hover group p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-600/25">
              <Icon name="wrench" className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-semibold">I&apos;m the landlord</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Manage tenants, work through tickets, and send blast notices for rent, trash, or upcoming repairs.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition group-hover:gap-2">
            Open admin panel <Icon name="arrow-right" className="h-4 w-4" />
          </span>
        </Link>

        <Link href="/contractor/signup" className="card card-hover group p-6 sm:p-7 sm:col-span-2">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-md shadow-amber-600/25">
              <Icon name="hard-hat" className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-semibold">I&apos;m a contractor</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Sign up to get notified about jobs that match your trade, pick up work in one tap, and keep tenants updated on your arrival time and progress.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition group-hover:gap-2">
            Create a contractor account <Icon name="arrow-right" className="h-4 w-4" />
          </span>
        </Link>
      </section>

      <section className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 pb-16 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2"><Icon name="ticket" className="h-4 w-4 text-brand-500" /> Track every request</span>
        <span className="inline-flex items-center gap-2"><Icon name="megaphone" className="h-4 w-4 text-brand-500" /> Rent &amp; trash reminders</span>
        <span className="inline-flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-brand-500" /> Automatic email updates</span>
      </section>

      <footer className="mx-auto max-w-5xl px-5 pb-10 text-center text-xs text-slate-400">
        ProperTkt · A small-landlord toolkit
      </footer>
    </main>
  );
}
