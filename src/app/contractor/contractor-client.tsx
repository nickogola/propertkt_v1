"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryIcon, Icon } from "@/components/icons";
import { urgencyClass, urgencyLabel, preferredTimingText } from "@/lib/ticket-ui";
import {
  assignmentLabel,
  assignmentClass,
  formatDuration,
  CONTRACTOR_PROGRESS_STATUSES,
} from "@/lib/assignment-ui";

export type ContractorTicket = {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  assignmentStatus: string;
  etaAt: string | null;
  estimatedDurationMins: number | null;
  contractorNotes: string | null;
  createdAt: string;
  preferredTiming: string;
  preferredAt: string | null;
  tenant: { name: string | null; unit: string; phone: string | null };
};

export default function ContractorClient({
  initialAvailable,
  initialMine,
}: {
  initialAvailable: ContractorTicket[];
  initialMine: ContractorTicket[];
}) {
  const router = useRouter();
  const [available, setAvailable] = useState(initialAvailable);
  const [mine, setMine] = useState(initialMine);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/tickets", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.available)) {
      setAvailable(
        data.available.map((t: ContractorTicket & { tenant: { unit: string } }) => ({
          ...t,
          tenant: { name: null, unit: t.tenant.unit, phone: null },
        })),
      );
    }
    if (Array.isArray(data.mine)) setMine(data.mine);
  }, []);

  // Poll so new offers appear and claimed jobs drop off without a manual reload.
  useEffect(() => {
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contractor dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick up jobs that match your trade, then keep the tenant posted with your arrival time and progress.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Icon name="briefcase" className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-semibold">Available jobs</h2>
          <span className="pill bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">{available.length}</span>
        </div>

        {available.length === 0 ? (
          <div className="card mt-3 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">No open jobs right now</p>
            <p className="mt-1 text-xs text-slate-500">You&apos;ll be notified when a new request matches your trades.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {available.map((t) => (
              <AvailableCard key={t.id} ticket={t} onDone={refresh} router={router} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon name="hard-hat" className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-semibold">My jobs</h2>
          <span className="pill bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">{mine.length}</span>
        </div>

        {mine.length === 0 ? (
          <div className="card mt-3 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">No active jobs yet</p>
            <p className="mt-1 text-xs text-slate-500">Accept an available job and it&apos;ll show up here.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {mine.map((t) => (
              <MyJobCard key={t.id} ticket={t} onDone={refresh} router={router} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AvailableCard({
  ticket,
  onDone,
  router,
}: {
  ticket: ContractorTicket;
  onDone: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/tickets/${ticket.id}/accept`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't accept this job.");
      setBusy(false);
      onDone();
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CategoryIcon category={ticket.category} className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium leading-tight">{ticket.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {ticket.category} · Unit {ticket.tenant.unit} · {new Date(ticket.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600">
              <Icon name="clock" className="h-3.5 w-3.5 text-slate-400" />
              Preferred: {preferredTimingText(ticket.preferredTiming, ticket.preferredAt)}
            </p>
          </div>
        </div>
        <span className={`pill ${urgencyClass(ticket.urgency)}`}>{urgencyLabel(ticket.urgency)}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4">
        <button className="btn-primary" disabled={busy} onClick={accept}>
          {busy ? "Accepting..." : "Accept job"}
        </button>
      </div>
    </li>
  );
}

function MyJobCard({
  ticket,
  onDone,
  router,
}: {
  ticket: ContractorTicket;
  onDone: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [status, setStatus] = useState(ticket.assignmentStatus);
  const [eta, setEta] = useState(toLocalInput(ticket.etaAt));
  const [duration, setDuration] = useState(ticket.estimatedDurationMins?.toString() ?? "");
  const [notes, setNotes] = useState(ticket.contractorNotes ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/tickets/${ticket.id}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentStatus: status,
        etaAt: eta ? new Date(eta).toISOString() : null,
        estimatedDurationMins: duration ? Number(duration) : null,
        contractorNotes: notes || null,
      }),
    });
    if (res.ok) {
      setMsg({ kind: "ok", text: "Saved. The tenant has been notified." });
      router.refresh();
      onDone();
    } else {
      setMsg({ kind: "err", text: "Failed to save." });
    }
    setBusy(false);
  }

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <CategoryIcon category={ticket.category} className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium leading-tight">{ticket.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Unit {ticket.tenant.unit}
              {ticket.tenant.name ? ` · ${ticket.tenant.name}` : ""}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600">
              <Icon name="clock" className="h-3.5 w-3.5 text-slate-400" />
              Preferred: {preferredTimingText(ticket.preferredTiming, ticket.preferredAt)}
            </p>
          </div>
        </div>
        <span className={`pill ${assignmentClass(ticket.assignmentStatus)}`}>{assignmentLabel(ticket.assignmentStatus)}</span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{ticket.description}</p>
      {ticket.tenant.phone && (
        <p className="mt-2 text-xs text-slate-500">
          Tenant phone: <span className="font-medium text-slate-700">{ticket.tenant.phone}</span>
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {CONTRACTOR_PROGRESS_STATUSES.map((s) => (
              <option key={s} value={s}>{assignmentLabel(s)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Arrival time</label>
          <input type="datetime-local" className="input" value={eta} onChange={(e) => setEta(e.target.value)} />
        </div>
        <div>
          <label className="label">Est. duration (mins)</label>
          <input
            type="number"
            min={0}
            className="input"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 90"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="label">Note to tenant</label>
        <textarea
          className="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Running 15 minutes late, on my way."
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={busy} onClick={save}>
          {busy ? "Saving..." : "Save & notify tenant"}
        </button>
        {formatDuration(ticket.estimatedDurationMins) && (
          <span className="text-xs text-slate-500">
            Current estimate: {formatDuration(ticket.estimatedDurationMins)}
          </span>
        )}
        {msg && (
          <span className={`text-sm ${msg.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>
        )}
      </div>
    </li>
  );
}

/** Convert an ISO string to a value usable by <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
