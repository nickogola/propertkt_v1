"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryIcon, Icon } from "@/components/icons";
import { CATEGORIES } from "@/lib/ticket-ui";

export type AdminContractor = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  trades: string[];
  active: boolean;
  ticketCount: number;
};

export default function ContractorsClient({ initialContractors }: { initialContractors: AdminContractor[] }) {
  const router = useRouter();
  const [contractors] = useState<AdminContractor[]>(initialContractors);
  const [editing, setEditing] = useState<AdminContractor | null>(null);
  const [adding, setAdding] = useState(false);

  async function onDelete(id: string) {
    if (!confirm("Delete this contractor? They'll be unassigned from any open jobs.")) return;
    const res = await fetch(`/api/contractors/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("Failed to delete contractor.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contractors</h1>
          <p className="mt-1 text-sm text-slate-600">Trades, contact info, and availability. Assign them to tickets from the Tickets page.</p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" className="h-4 w-4" /> Add contractor
        </button>
      </div>

      {contractors.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="hard-hat" className="h-6 w-6" />
          </span>
          <p className="mt-3 font-medium text-slate-700">No contractors yet</p>
          <p className="mt-1 text-sm text-slate-500">Add your trusted trades so you can assign them to tickets.</p>
          <button className="btn-primary mt-5" onClick={() => setAdding(true)}>
            <Icon name="plus" className="h-4 w-4" /> Add contractor
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <ul className="space-y-3 md:hidden">
            {contractors.map((c) => (
              <li key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon name="hard-hat" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{c.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{c.company ?? c.email}</p>
                    </div>
                  </div>
                  {c.active ? (
                    <span className="pill bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">Active</span>
                  ) : (
                    <span className="pill bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">Inactive</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.trades.length === 0 ? (
                    <span className="text-xs text-slate-400">No trades set</span>
                  ) : (
                    c.trades.map((t) => (
                      <span key={t} className="pill bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">{t}</span>
                    ))
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>{c.phone ?? "No phone"} · {c.ticketCount} job{c.ticketCount === 1 ? "" : "s"}</span>
                  <span className="flex gap-3">
                    <button className="font-medium text-brand-600" onClick={() => setEditing(c)}>Edit</button>
                    <button className="font-medium text-red-600" onClick={() => onDelete(c.id)}>Delete</button>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Trades</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Jobs</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractors.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.company ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.trades.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          c.trades.map((t) => (
                            <span key={t} className="pill bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">{t}</span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.active ? (
                        <span className="pill bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">Active</span>
                      ) : (
                        <span className="pill bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.ticketCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="mr-3 text-sm font-medium text-brand-600 hover:text-brand-700" onClick={() => setEditing(c)}>Edit</button>
                      <button className="text-sm font-medium text-red-600 hover:text-red-700" onClick={() => onDelete(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(adding || editing) && (
        <ContractorFormModal
          contractor={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function ContractorFormModal({ contractor, onClose, onSaved }: { contractor: AdminContractor | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!contractor;
  const [form, setForm] = useState({
    name: contractor?.name ?? "",
    company: contractor?.company ?? "",
    email: contractor?.email ?? "",
    phone: contractor?.phone ?? "",
    active: contractor?.active ?? true,
    password: "",
  });
  const [trades, setTrades] = useState<string[]>(contractor?.trades ?? []);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleTrade(t: string) {
    setTrades((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!isEdit && !form.password) {
      setError("Set an initial password so the contractor can sign in.");
      setSubmitting(false);
      return;
    }

    const body: Record<string, unknown> = {
      name: form.name,
      company: form.company || null,
      email: form.email,
      phone: form.phone || null,
      active: form.active,
      trades,
    };
    if (form.password) body.password = form.password;

    const url = isEdit ? `/api/contractors/${contractor!.id}` : "/api/contractors";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save.");
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit contractor" : "Add contractor"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="input" value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="555-555-5555" />
            </div>
          </div>
          <div>
            <label className="label">Trades</label>
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
          <div>
            <label className="label">
              {isEdit ? "Reset password (leave blank to keep current)" : "Initial password"}
            </label>
            <input
              className="input"
              type="text"
              minLength={8}
              required={!isEdit}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 characters — share with the contractor out-of-band"
            />
            <p className="mt-1 text-xs text-slate-500">
              Stored hashed (scrypt). Contractor signs in at /contractor/login.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="font-medium text-slate-700">Active</span>
            <span className="text-slate-500">— inactive contractors can&apos;t sign in or be assigned</span>
          </label>
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
