"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function AdminLoginPage() {
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
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Login failed.");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
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
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign-in</h1>
          <p className="mt-1 text-sm text-slate-600">Use the credentials from your <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.env.local</code>.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
