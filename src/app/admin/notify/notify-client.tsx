"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";

type Tenant = { id: string; name: string; unit: string; email: string; phone: string | null };
type Channel = "email" | "whatsapp";
type ChannelResult = { sent: number; failures: string[] };

const TEMPLATES: Record<string, { label: string; icon: IconName; subject: string; body: string }> = {
  rent: {
    label: "Rent reminder",
    icon: "banknote",
    subject: "Friendly reminder: rent is due",
    body: "This is a friendly reminder that rent is due on the 1st of the month. Please let me know if you have any questions.",
  },
  trash: {
    label: "Trash pickup",
    icon: "trash",
    subject: "Trash pickup reminder",
    body: "Reminder: please have your trash bins out by 7am on pickup day. Bring them back in by the end of that day.",
  },
  repair: {
    label: "Upcoming repair",
    icon: "wrench",
    subject: "Upcoming maintenance — please read",
    body: "I wanted to let you know about upcoming maintenance at the property. Details:\n\n- Date:\n- Time window:\n- What to expect:\n\nReach out with any questions.",
  },
  custom: { label: "Custom", icon: "pencil", subject: "", body: "" },
};

const CHANNELS: { key: Channel; label: string; icon: IconName; hint: string }[] = [
  { key: "email", label: "Email", icon: "mail", hint: "Sent to each tenant's email on file" },
  { key: "whatsapp", label: "WhatsApp", icon: "message", hint: "Sent to each tenant's phone on file" },
];

export default function NotifyClient({ tenants }: { tenants: Tenant[] }) {
  const [template, setTemplate] = useState<keyof typeof TEMPLATES>("rent");
  const [subject, setSubject] = useState(TEMPLATES.rent.subject);
  const [body, setBody] = useState(TEMPLATES.rent.body);
  const [channels, setChannels] = useState<Set<Channel>>(new Set(["email"]));
  const [selected, setSelected] = useState<Set<string>>(new Set(tenants.map((t) => t.id)));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; results: Partial<Record<Channel, ChannelResult>> } | null>(null);
  const [error, setError] = useState("");

  function applyTemplate(key: keyof typeof TEMPLATES) {
    setTemplate(key);
    setSubject(TEMPLATES[key].subject);
    setBody(TEMPLATES[key].body);
  }

  function toggleChannel(c: Channel) {
    const next = new Set(channels);
    if (next.has(c)) next.delete(c); else next.add(c);
    setChannels(next);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  const whatsappOn = channels.has("whatsapp");
  const noPhoneSelected = whatsappOn
    ? tenants.filter((t) => selected.has(t.id) && !t.phone).length
    : 0;

  async function onSend() {
    setSending(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        recipientIds: Array.from(selected),
        channels: Array.from(channels),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to send.");
    } else {
      setResult({ total: data.total, results: data.results ?? {} });
    }
    setSending(false);
  }

  const channelLabel = Array.from(channels)
    .map((c) => (c === "email" ? "Email" : "WhatsApp"))
    .join(" + ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Send notification</h1>
        <p className="mt-1 text-sm text-slate-600">Message any subset of tenants by email, WhatsApp, or both.</p>
      </div>

      <div className="card space-y-5 p-5 sm:p-6">
        <div>
          <label className="label">Send via</label>
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            {CHANNELS.map((c) => {
              const on = channels.has(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggleChannel(c.key)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    on
                      ? c.key === "whatsapp"
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      on
                        ? c.key === "whatsapp"
                          ? "bg-emerald-500 text-white"
                          : "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon name={c.icon} className="h-5 w-5" />
                  </span>
                  <span>
                    <span className={`block text-sm font-medium ${on ? "text-slate-900" : "text-slate-700"}`}>
                      {c.label}
                    </span>
                    <span className="block text-[11px] leading-tight text-slate-500">{c.hint}</span>
                  </span>
                  <span className="ml-auto">
                    {on && <Icon name="check" className={`h-4 w-4 ${c.key === "whatsapp" ? "text-emerald-600" : "text-brand-600"}`} />}
                  </span>
                </button>
              );
            })}
          </div>
          {channels.size === 0 && (
            <p className="mt-2 text-xs font-medium text-red-600">Pick at least one channel.</p>
          )}
        </div>

        <div>
          <label className="label">Template</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((k) => (
              <button
                key={k}
                onClick={() => applyTemplate(k)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition ${
                  template === k
                    ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Icon name={TEMPLATES[k].icon} className="h-5 w-5" />
                <span>{TEMPLATES[k].label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Subject</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea className="textarea min-h-[180px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." />
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">
            Recipients <span className="ml-1 text-sm font-normal text-slate-500">({selected.size} of {tenants.length})</span>
          </h2>
          <div className="flex gap-3 text-sm">
            <button className="font-medium text-brand-600 hover:text-brand-700" onClick={() => setSelected(new Set(tenants.map((t) => t.id)))}>Select all</button>
            <button className="font-medium text-slate-600 hover:text-slate-900" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
        {noPhoneSelected > 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
            {noPhoneSelected} selected tenant{noPhoneSelected === 1 ? " has" : "s have"} no phone number on file — they&apos;ll be skipped for WhatsApp{channels.has("email") ? " but still emailed" : ""}.
          </p>
        )}
        <ul className="mt-3 divide-y divide-slate-100">
          {tenants.map((t) => (
            <li key={t.id}>
              <label htmlFor={`r-${t.id}`} className="flex cursor-pointer items-center gap-3 py-2.5">
                <input
                  id={`r-${t.id}`}
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggle(t.id)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm">
                  <span className="font-medium">Unit {t.unit}</span> · {t.name}
                  <span className="ml-1 hidden text-slate-500 sm:inline">&lt;{t.email}&gt;</span>
                </span>
                {whatsappOn && !t.phone && (
                  <span className="pill ml-auto bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">No phone</span>
                )}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</p>
      )}
      {result && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
          {(Object.entries(result.results) as [Channel, ChannelResult][]).map(([channel, r]) => (
            <div key={channel} className="py-0.5">
              <p className="font-medium">
                {channel === "email" ? "Email" : "WhatsApp"}: sent to {r.sent} of {result.total}.
              </p>
              {r.failures.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-amber-800">
                  {r.failures.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          className="btn-primary w-full sm:w-auto"
          disabled={sending || selected.size === 0 || channels.size === 0 || !subject.trim() || !body.trim()}
          onClick={onSend}
        >
          <Icon name="megaphone" className="h-4 w-4" />
          {sending ? "Sending..." : `Send via ${channelLabel || "…"} to ${selected.size} tenant${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
