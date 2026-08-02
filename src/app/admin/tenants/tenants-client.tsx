"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  unit: string;
  notes: string | null;
  ticketCount: number;
  hasPassword: boolean;
};

export default function TenantsClient({ initialTenants }: { initialTenants: Tenant[] }) {
  const router = useRouter();
  const [tenants] = useState<Tenant[]>(initialTenants);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [adding, setAdding] = useState(false);

  async function onDelete(id: string) {
    if (!confirm("Delete this tenant? Their tickets will also be removed.")) return;
    const res = await fetch(`/api/tenants/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("Failed to delete tenant.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
          <p className="mt-1 text-sm text-slate-600">Names, contact info, and units. Tickets cascade on delete.</p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" className="h-4 w-4" /> Add tenant
        </button>
      </div>

      {tenants.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="users" className="h-6 w-6" />
          </span>
          <p className="mt-3 font-medium text-slate-700">No tenants yet</p>
          <p className="mt-1 text-sm text-slate-500">Add your first to start receiving maintenance tickets.</p>
          <button className="btn-primary mt-5" onClick={() => setAdding(true)}>
            <Icon name="plus" className="h-4 w-4" /> Add tenant
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <ul className="space-y-3 md:hidden">
            {tenants.map((t) => (
              <li key={t.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">
                      {t.unit}
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{t.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{t.email}</p>
                    </div>
                  </div>
                  {t.hasPassword ? (
                    <span className="pill bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">Active</span>
                  ) : (
                    <span className="pill bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">No password</span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>{t.phone ?? "No phone"} · {t.ticketCount} ticket{t.ticketCount === 1 ? "" : "s"}</span>
                  <span className="flex gap-3">
                    <button className="font-medium text-brand-600" onClick={() => setEditing(t)}>Edit</button>
                    <button className="font-medium text-red-600" onClick={() => onDelete(t.id)}>Delete</button>
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
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Login</th>
                  <th className="px-4 py-3">Tickets</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold">{t.unit}</td>
                    <td className="px-4 py-3">{t.name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.email}</td>
                    <td className="px-4 py-3 text-slate-600">{t.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      {t.hasPassword ? (
                        <span className="pill bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">Active</span>
                      ) : (
                        <span className="pill bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">No password</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.ticketCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="mr-3 text-sm font-medium text-brand-600 hover:text-brand-700" onClick={() => setEditing(t)}>Edit</button>
                      <button className="text-sm font-medium text-red-600 hover:text-red-700" onClick={() => onDelete(t.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(adding || editing) && (
        <TenantFormModal
          tenant={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function TenantFormModal({ tenant, onClose, onSaved }: { tenant: Tenant | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!tenant;
  const [form, setForm] = useState({
    name: tenant?.name ?? "",
    email: tenant?.email ?? "",
    phone: tenant?.phone ?? "",
    unit: tenant?.unit ?? "",
    notes: tenant?.notes ?? "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const url = isEdit ? `/api/tenants/${tenant!.id}` : "/api/tenants";
    const method = isEdit ? "PATCH" : "POST";

    // Strip empty password on edit so we don't overwrite with nothing.
    const body: Record<string, unknown> = { ...form };
    if (!body.password) delete body.password;
    if (!isEdit && !body.password) {
      setError("Set an initial password so the tenant can sign in.");
      setSubmitting(false);
      return;
    }

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
          <h2 className="text-lg font-semibold">{isEdit ? "Edit tenant" : "Add tenant"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Unit</label>
              <input className="input" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="1" />
            </div>
            <div>
              <label className="label">Name</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="555-555-5555" />
          </div>
          <div>
            <label className="label">
              {isEdit ? "Reset password (leave blank to keep current)" : "Initial password"}
            </label>
            <input
              className="input"
              type="text"
              minLength={6}
              required={!isEdit}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters — share with the tenant out-of-band"
            />
            <p className="mt-1 text-xs text-slate-500">
              Stored hashed (scrypt). Tenant signs in at /tenant/login.
            </p>
          </div>
          <div>
            <label className="label">Notes (private)</label>
            <textarea className="textarea" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Lease end date, parking spot, anything for your reference..." />
          </div>
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
