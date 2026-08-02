// Shared labels/classes for the contractor assignment workflow.

export const ASSIGNMENT_STATUSES = [
  "unassigned",
  "offered",
  "accepted",
  "en_route",
  "on_site",
  "completed",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

// Statuses a contractor can set once they own the job.
export const CONTRACTOR_PROGRESS_STATUSES = [
  "accepted",
  "en_route",
  "on_site",
  "completed",
] as const;

export function assignmentLabel(status: string): string {
  switch (status) {
    case "unassigned": return "Not yet assigned";
    case "offered": return "Finding a contractor";
    case "accepted": return "Contractor assigned";
    case "en_route": return "Contractor on the way";
    case "on_site": return "Work in progress";
    case "completed": return "Work completed";
    default: return status;
  }
}

export function assignmentClass(status: string): string {
  switch (status) {
    case "unassigned": return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
    case "offered": return "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200";
    case "accepted": return "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200";
    case "en_route": return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200";
    case "on_site": return "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200";
    case "completed": return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
    default: return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
  }
}

/** Human-friendly duration from minutes, e.g. 90 -> "1h 30m". */
export function formatDuration(mins: number | null | undefined): string | null {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
