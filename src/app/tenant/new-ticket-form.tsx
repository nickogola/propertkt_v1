"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, URGENCIES } from "@/lib/ticket-ui";
import { CategoryIcon, Icon } from "@/components/icons";

export default function NewTicketForm() {
  const router = useRouter();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Plumbing");
  const [urgency, setUrgency] = useState<(typeof URGENCIES)[number]>("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timing, setTiming] = useState<"asap" | "scheduled">("asap");
  const [preferredAt, setPreferredAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isUrgent = urgency === "emergency" || urgency === "high";
  // Local-time "now", formatted for a datetime-local min attribute.
  const minPreferred = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    if (timing === "scheduled" && !preferredAt) {
      setError("Please choose a preferred date and time, or pick \u201cAs soon as possible\u201d.");
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
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
        throw new Error(data.error ?? "Could not submit ticket.");
      }
      setTitle("");
      setDescription("");
      setUrgency("normal");
      setTiming("asap");
      setPreferredAt("");
      // Send them to the list so they see the ticket they just submitted.
      router.push("/tenant/tickets");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
        <input className="input" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kitchen sink leaking under cabinet" />
      </div>
      <div>
        <label className="label">Details</label>
        <textarea className="textarea min-h-[120px]" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When it started, what you've tried, how to access the unit, best times to reach you..." />
      </div>

      <div>
        <label className="label">Preferred visit time</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setTiming("asap");
              setPreferredAt("");
            }}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
              timing === "asap"
                ? isUrgent
                  ? "border-red-500 bg-red-50"
                  : "border-brand-500 bg-brand-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Icon name="clock" className={`mt-0.5 h-5 w-5 ${timing === "asap" ? (isUrgent ? "text-red-600" : "text-brand-600") : "text-slate-400"}`} />
            <span>
              <span className="block text-sm font-medium text-slate-800">
                {isUrgent ? "Immediately" : "As soon as possible"}
              </span>
              <span className="block text-xs text-slate-500">
                {isUrgent ? "Send someone right away" : "First available slot"}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTiming("scheduled")}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
              timing === "scheduled"
                ? "border-brand-500 bg-brand-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Icon name="calendar" className={`mt-0.5 h-5 w-5 ${timing === "scheduled" ? "text-brand-600" : "text-slate-400"}`} />
            <span>
              <span className="block text-sm font-medium text-slate-800">Pick a date &amp; time</span>
              <span className="block text-xs text-slate-500">Choose a slot that works for you</span>
            </span>
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
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit ticket"}
      </button>
    </form>
  );
}
