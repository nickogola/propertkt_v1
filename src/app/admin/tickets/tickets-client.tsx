"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { statusLabel, statusClass, urgencyClass, urgencyLabel, preferredTimingText, STATUSES } from "@/lib/ticket-ui";
import { assignmentLabel, assignmentClass, formatDuration } from "@/lib/assignment-ui";
import { CategoryIcon, Icon } from "@/components/icons";

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  preferredTiming: string;
  preferredAt: string | null;
  tenant: { name: string; unit: string; email: string };
  assignmentStatus: string;
  contractorId: string | null;
  contractor: { name: string; company: string | null; phone: string | null } | null;
  etaAt: string | null;
  estimatedDurationMins: number | null;
  contractorNotes: string | null;
};

type ContractorOption = {
  id: string;
  name: string;
  company: string | null;
  trades: string[];
};

export default function TicketsClient({
  initialTickets,
  contractors,
}: {
  initialTickets: Ticket[];
  contractors: ContractorOption[];
}) {
  const [filter, setFilter] = useState<"all" | "active" | "closed">("active");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = initialTickets.filter((t) => {
    if (filter === "all") return true;
    if (filter === "active") return t.status === "open" || t.status === "in_progress";
    return t.status === "resolved" || t.status === "closed";
  });

  const counts = {
    active: initialTickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
    closed: initialTickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
    all: initialTickets.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="mt-1 text-sm text-slate-600">Tap a ticket to expand, update status, and email the tenant.</p>
        </div>
        <div className="inline-flex w-full rounded-xl border border-slate-200 bg-white p-1 text-sm sm:w-auto">
          {(["active", "all", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-lg px-3 py-1.5 font-medium transition sm:flex-none ${
                filter === f ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f[0].toUpperCase() + f.slice(1)}
              <span className={`ml-1.5 text-xs ${filter === f ? "opacity-80" : "text-slate-400"}`}>{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Icon name="check" className="h-6 w-6" />
          </span>
          <p className="mt-3 font-medium text-slate-700">Nothing here</p>
          <p className="mt-1 text-sm text-slate-500">No tickets match this filter.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => (
            <li key={t.id} className={`card overflow-hidden ${expanded === t.id ? "ring-1 ring-brand-200" : ""}`}>
              <button
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-slate-50/60"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <CategoryIcon category={t.category} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium leading-tight">{t.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Unit {t.tenant.unit} · {t.tenant.name} · {new Date(t.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`pill ${urgencyClass(t.urgency)}`}>{urgencyLabel(t.urgency)}</span>
                  <span className={`pill ${statusClass(t.status)}`}>{statusLabel(t.status)}</span>
                  {t.assignmentStatus !== "unassigned" && (
                    <span className={`pill ${assignmentClass(t.assignmentStatus)}`}>{assignmentLabel(t.assignmentStatus)}</span>
                  )}
                  <Icon
                    name="chevron-down"
                    className={`ml-1 h-4 w-4 text-slate-400 transition-transform ${expanded === t.id ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
              {expanded === t.id && <TicketDetail ticket={t} contractors={contractors} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TicketDetail({ ticket, contractors }: { ticket: Ticket; contractors: ContractorOption[] }) {
  const router = useRouter();
  const [status, setStatus] = useState(ticket.status);
  const [adminNotes, setAdminNotes] = useState(ticket.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes }),
    });
    if (res.ok) {
      setMsg({ kind: "ok", text: "Saved. Tenant has been emailed." });
      router.refresh();
    } else {
      setMsg({ kind: "err", text: "Failed to save." });
    }
    setSaving(false);
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50/40 p-4 sm:p-5">
      <div className="whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-200">
        {ticket.description}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Contact: <a href={`mailto:${ticket.tenant.email}`} className="text-brand-600 hover:underline">{ticket.tenant.email}</a>
      </p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <Icon name="clock" className="h-3.5 w-3.5 text-slate-400" />
        Preferred visit: {preferredTimingText(ticket.preferredTiming, ticket.preferredAt)}
      </p>

      <ContractorPanel ticket={ticket} contractors={contractors} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="label">Note to tenant (included in status email)</label>
        <textarea className="textarea" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="e.g. Plumber scheduled for Tuesday 9–11am." />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={saving} onClick={onSave}>
          {saving ? "Saving..." : "Save & email tenant"}
        </button>
        {msg && (
          <span className={`text-sm ${msg.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>
        )}
      </div>
    </div>
  );
}

function ContractorPanel({ ticket, contractors }: { ticket: Ticket; contractors: ContractorOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState("");

  async function findContractor() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/tickets/${ticket.id}/assign`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ kind: "ok", text: `Notified ${data.offered} contractor${data.offered === 1 ? "" : "s"}.` });
      router.refresh();
    } else {
      setMsg({ kind: "err", text: data.error ?? "Failed to notify contractors." });
    }
    setBusy(false);
  }

  async function assignDirect() {
    if (!selectedId) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/tickets/${ticket.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractorId: selectedId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ kind: "ok", text: "Contractor assigned. Both the contractor and tenant were notified." });
      router.refresh();
    } else {
      setMsg({ kind: "err", text: data.error ?? "Failed to assign contractor." });
    }
    setBusy(false);
  }

  const c = ticket.contractor;
  const dur = formatDuration(ticket.estimatedDurationMins);

  // Contractors whose trades match come first for convenience.
  const sortedContractors = [...contractors].sort((a, b) => {
    const am = a.trades.includes(ticket.category) ? 0 : 1;
    const bm = b.trades.includes(ticket.category) ? 0 : 1;
    return am - bm;
  });

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="hard-hat" className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Contractor</span>
        </div>
        <span className={`pill ${assignmentClass(ticket.assignmentStatus)}`}>{assignmentLabel(ticket.assignmentStatus)}</span>
      </div>

      {c ? (
        <div className="mt-3 space-y-1 text-sm text-slate-700">
          <p className="font-medium">{c.company ? `${c.name} · ${c.company}` : c.name}</p>
          {c.phone && <p className="text-xs text-slate-500">Phone: {c.phone}</p>}
          {ticket.etaAt && (
            <p className="text-xs text-slate-500">Arrival: {new Date(ticket.etaAt).toLocaleString()}</p>
          )}
          {dur && <p className="text-xs text-slate-500">Estimated time on site: {dur}</p>}
          {ticket.contractorNotes && (
            <p className="text-xs text-slate-500">Note: {ticket.contractorNotes}</p>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-slate-600">
            {ticket.assignmentStatus === "offered"
              ? "Contractors have been notified — waiting for one to accept."
              : "No contractor assigned yet."}
          </p>

          {/* Direct assignment */}
          <div>
            <label className="label">Assign a specific contractor</label>
            {contractors.length === 0 ? (
              <p className="text-xs text-slate-500">
                No active contractors yet. Add one on the Contractors page first.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="select max-w-xs"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">Choose a contractor…</option>
                  {sortedContractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.name} (${c.company})` : c.name}
                      {c.trades.includes(ticket.category) ? ` — ${ticket.category}` : ""}
                    </option>
                  ))}
                </select>
                <button className="btn-primary" disabled={busy || !selectedId} onClick={assignDirect}>
                  {busy ? "Assigning..." : "Assign"}
                </button>
              </div>
            )}
          </div>

          {/* Broadcast option */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">Or let any matching contractor pick it up first:</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button className="btn-secondary" disabled={busy} onClick={findContractor}>
                {busy
                  ? "Notifying..."
                  : ticket.assignmentStatus === "offered"
                  ? "Re-notify contractors"
                  : "Notify matching contractors"}
              </button>
            </div>
          </div>

          {msg && (
            <span className={`block text-sm ${msg.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>
          )}
        </div>
      )}
    </div>
  );
}
