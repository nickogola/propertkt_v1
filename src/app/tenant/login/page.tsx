"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function TenantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/tenant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Sign-in failed.");
      }
      router.push("/tenant/new");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-marketing flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-md px-6 py-6">
        <Logo size="md" />
      </header>
      <div className="flex flex-1 items-center justify-center px-6 pb-12">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Tenant sign-in</h1>
          <p className="mt-1 text-sm text-slate-600">
            Use the email and password your landlord set up for you.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-500">
            Forgot your password? Contact your landlord and they can reset it from the admin panel.
          </p>
        </div>
      </div>
    </main>
  );
}
