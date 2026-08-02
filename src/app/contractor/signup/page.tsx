"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { CategoryIcon } from "@/components/icons";
import { CATEGORIES } from "@/lib/ticket-ui";

export default function ContractorSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [trades, setTrades] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleTrade(t: string) {
    setTrades((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/contractor/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, phone, password, trades }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sign-up failed.");
      router.push("/contractor");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-marketing flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-lg px-6 py-6">
        <Logo size="md" />
      </header>
      <div className="flex flex-1 items-center justify-center px-6 pb-12">
        <div className="card w-full max-w-lg p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Contractor sign-up</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create an account to get notified about jobs and pick up work that matches your trade.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="label" htmlFor="company">Company (optional)</label>
                <input id="company" value={company} onChange={(e) => setCompany(e.target.value)} className="input" placeholder="Doe Plumbing LLC" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
              </div>
              <div>
                <label className="label" htmlFor="phone">Phone (for WhatsApp updates)</label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="555-0100" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="At least 8 characters" />
            </div>
            <div>
              <label className="label">Trades you cover</label>
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => {
                  const on = trades.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleTrade(c)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        on
                          ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <CategoryIcon category={c} className="h-4 w-4" /> {c}
                    </button>
                  );
                })}
              </div>
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/contractor/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
