"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CategoryIcon, Icon } from "@/components/icons";
import { statusLabel, statusClass, urgencyClass, urgencyLabel, preferredTimingText, CATEGORIES, URGENCIES } from "@/lib/ticket-ui";
import { assignmentLabel, assignmentClass, formatDuration } from "@/lib/assignment-ui";

export type TenantTicket = {
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
  assignmentStatus: string;
  etaAt: string | null;
  estimatedDurationMins: number | null;
  contractorNotes: string | null;
  contractor: { name: string; company: string | null } | null;
};

export default function TenantTicketsClient({ initialTickets }: { initialTickets: TenantTicket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: "close" | "delete" } | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleClose(id: string) {
    setActionPending(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not close ticket.");
      }
      const { ticket: updated } = await res.json();
      setTickets((prev) => prev.map((x) => (x.id === id ? { ...x, status: updated.status } : x)));
      setConfirmAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleDelete(id: string) {
    setActionPending(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not delete ticket.");
      }
      setTickets((prev) => prev.filter((x) => x.id !== id));
      setConfirmAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setActionPending(false);
    }
  }

  const refresh = useCallback(async () => {
    const res = await fetch("/api/tickets", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.tickets)) setTickets(data.tickets);
  }, []);

  // Live updates: poll while any ticket has an active contractor so the tenant
  // sees arrival time and progress without refreshing.
  const hasActive = tickets.some(
    (t) => t.assignmentStatus !== "unassigned" && t.assignmentStatus !== "completed",
  );
  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [hasActive, refresh]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My tickets</h1>
          <p className="mt-1 text-sm text-slate-600">
            {tickets.length === 0
              ? "You haven't submitted any tickets yet."
              : `${tickets.length} total · most recent first.`}
          </p>
        </div>
        <Link href="/tenant/new" className="btn-primary">
          <Icon name="plus" className="h-4 w-4" /> New ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="ticket" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-medium text-slate-700">No tickets yet</p>
          <p className="mt-1 text-xs text-slate-500">When you submit one, it&apos;ll show up here.</p>
          <Link href="/tenant/new" className="btn-primary mt-5 inline-flex">
            <Icon name="plus" className="h-4 w-4" /> Submit your first ticket
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li key={t.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <CategoryIcon category={t.category} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-medium leading-tight">{t.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.category} · {new Date(t.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                      <Icon name="clock" className="h-3.5 w-3.5 text-slate-400" />
                      Preferred: {preferredTimingText(t.preferredTiming, t.preferredAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`pill ${urgencyClass(t.urgency)}`}>{urgencyLabel(t.urgency)}--***</span>
                  <span className={`pill ${statusClass(t.status)}`}>{statusLabel(t.status)}</span>
                  {t.status === "open" && t.assignmentStatus === "unassigned" && (
                    <button
                      onClick={() => { setEditingId(editingId === t.id ? null : t.id); setConfirmAction(null); }}
                      className="pill bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 transition"
                    >
                      <Icon name="pencil" className="h-3 w-3" />
                      {editingId === t.id ? "Cancel" : "Edit"}
                    </button>
                  )}
                  {t.status !== "closed" && t.status !== "resolved" && editingId !== t.id && (
                    <button
                      onClick={() => { setConfirmAction({ id: t.id, type: "close" }); setActionError(null); }}
                      className="pill bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 transition"
                    >
                      <Icon name="x" className="h-3 w-3" />
                      Close
                    </button>
                  )}
                  {t.status === "open" && t.assignmentStatus === "unassigned" && editingId !== t.id && (
                    <button
                      onClick={() => { setConfirmAction({ id: t.id, type: "delete" }); setActionError(null); }}
                      className="pill bg-red-50 text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-100 transition"
                    >
                      <Icon name="trash" className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{t.description}</p>

              {editingId === t.id && (
                <EditTicketForm
                  ticket={t}
                  onSave={(updated) => {
                    setTickets((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              )}

              {confirmAction?.id === t.id && (
                <div className={`mt-3 rounded-xl p-3 text-sm ring-1 ring-inset ${
                  confirmAction.type === "delete"
                    ? "bg-red-50 ring-red-200"
                    : "bg-slate-50 ring-slate-200"
                }`}>
                  <p className="font-medium text-slate-800">
                    {confirmAction.type === "delete"
                      ? "Delete this ticket? This cannot be undone."
                      : "Close this ticket? You\'re marking it as no longer needed."}
                  </p>
                  {actionError && <p className="mt-1 text-red-600">{actionError}</p>}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => confirmAction.type === "delete" ? handleDelete(t.id) : handleClose(t.id)}
                      disabled={actionPending}
                      className={`btn-sm ${
                        confirmAction.type === "delete" ? "bg-red-600 text-white hover:bg-red-700" : "btn-primary"
                      }`}
                    >
                      {actionPending ? "Please wait…" : confirmAction.type === "delete" ? "Yes, delete" : "Yes, close it"}
                    </button>
                    <button
                      onClick={() => { setConfirmAction(null); setActionError(null); }}
                      disabled={actionPending}
                      className="btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {t.assignmentStatus !== "unassigned" && <ContractorTracker ticket={t} />}

              {t.adminNotes && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Landlord note</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{t.adminNotes}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ContractorTracker({ ticket }: { ticket: TenantTicket }) {
  const c = ticket.contractor;
  const dur = formatDuration(ticket.estimatedDurationMins);
  return (
    <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-inset ring-brand-100">
            <Icon name="hard-hat" className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-slate-700">Contractor update</span>
        </div>
        <span className={`pill ${assignmentClass(ticket.assignmentStatus)}`}>{assignmentLabel(ticket.assignmentStatus)}</span>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        {c && (
          <div className="flex items-center gap-2">
            <Icon name="briefcase" className="h-4 w-4 text-slate-400" />
            <span>{c.company ? `${c.name} · ${c.company}` : c.name}</span>
          </div>
        )}
        {ticket.etaAt && (
          <div className="flex items-center gap-2">
            <Icon name="truck" className="h-4 w-4 text-slate-400" />
            <span>Arriving {new Date(ticket.etaAt).toLocaleString()}</span>
          </div>
        )}
        {dur && (
          <div className="flex items-center gap-2">
            <Icon name="clock" className="h-4 w-4 text-slate-400" />
            <span>Estimated {dur} on site</span>
          </div>
        )}
      </div>

      {ticket.contractorNotes && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-white p-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
          <Icon name="message" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span className="whitespace-pre-wrap">{ticket.contractorNotes}</span>
        </div>
      )}
    </div>
  );
}

type EditableFields = Pick<TenantTicket, "id" | "category" | "urgency" | "title" | "description" | "preferredTiming" | "preferredAt">;

function EditTicketForm({
  ticket,
  onSave,
  onCancel,
}: {
  ticket: EditableFields;
  onSave: (updated: EditableFields) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(ticket.category as (typeof CATEGORIES)[number]);
  const [urgency, setUrgency] = useState<(typeof URGENCIES)[number]>(ticket.urgency as (typeof URGENCIES)[number]);
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [timing, setTiming] = useState<"asap" | "scheduled">(ticket.preferredTiming as "asap" | "scheduled");
  const [preferredAt, setPreferredAt] = useState(
    ticket.preferredAt ? new Date(ticket.preferredAt).toISOString().slice(0, 16) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const minPreferred = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (timing === "scheduled" && !preferredAt) {
      setError("Please choose a preferred date and time, or pick \u201cAs soon as possible\u201d.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          urgency,
          title,
          description,
          preferredTiming: timing,
          preferredAt: timing === "scheduled" ? new Date(preferredAt).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save changes.");
      }
      const { ticket: updated } = await res.json();
      onSave({
        id: updated.id,
        category: updated.category,
        urgency: updated.urgency,
        title: updated.title,
        description: updated.description,
        preferredTiming: updated.preferredTiming,
        preferredAt: updated.preferredAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edit ticket</p>

      <div>
        <label className="label">Category</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition ${
                category === c
                  ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <CategoryIcon category={c} className="h-5 w-5" />
              <span>{c}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Urgency</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {URGENCIES.map((u) => (
            <button
              type="button"
              key={u}
              onClick={() => setUrgency(u)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ${
                urgency === u
                  ? u === "emergency"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : u === "high"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Short title</label>
        <input className="input" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className="label">Details</label>
        <textarea className="textarea min-h-[100px]" required value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <label className="label">Preferred visit time</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => { setTiming("asap"); setPreferredAt(""); }}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${
              timing === "asap" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon name="clock" className="h-4 w-4" />
            As soon as possible
          </button>
          <button
            type="button"
            onClick={() => setTiming("scheduled")}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${
              timing === "scheduled" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon name="calendar" className="h-4 w-4" />
            Pick a date &amp; time
          </button>
        </div>
        {timing === "scheduled" && (
          <input
            type="datetime-local"
            className="input mt-2"
            min={minPreferred}
            value={preferredAt}
            onChange={(e) => setPreferredAt(e.target.value)}
          />
        )}
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
