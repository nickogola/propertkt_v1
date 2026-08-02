export function statusLabel(status: string): string {
  switch (status) {
    case "open": return "Open";
    case "in_progress": return "In progress";
    case "resolved": return "Resolved";
    case "closed": return "Closed";
    default: return status;
  }
}

export function statusClass(status: string): string {
  switch (status) {
    case "open": return "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200";
    case "in_progress": return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200";
    case "resolved": return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
    case "closed": return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
    default: return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}

export function urgencyClass(urgency: string): string {
  switch (urgency) {
    case "emergency": return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";
    case "high": return "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200";
    case "normal": return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
    case "low": return "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200";
    default: return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}

export function urgencyLabel(urgency: string): string {
  switch (urgency) {
    case "low": return "Low";
    case "normal": return "Normal";
    case "high": return "High";
    case "emergency": return "Emergency";
    default: return urgency;
  }
}

export const CATEGORIES = ["Plumbing", "Appliance", "HVAC", "Electrical", "Pest", "Other"] as const;
export const URGENCIES = ["low", "normal", "high", "emergency"] as const;
export const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

// Tenant's preferred time for a contractor visit.
export function preferredTimingText(preferredTiming: string, preferredAt: string | null): string {
  if (preferredTiming === "asap") return "As soon as possible";
  if (preferredAt) {
    return new Date(preferredAt).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return "No preference";
}
