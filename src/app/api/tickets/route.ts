import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { adminEmail } from "@/lib/auth";
import { preferredTimingText } from "@/lib/ticket-ui";

const createSchema = z
  .object({
    category: z.enum(["Plumbing", "Appliance", "HVAC", "Electrical", "Pest", "Other"]),
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(4000),
    urgency: z.enum(["low", "normal", "high", "emergency"]).default("normal"),
    preferredTiming: z.enum(["asap", "scheduled"]).default("asap"),
    preferredAt: z.string().datetime().nullable().optional(),
  })
  .refine((d) => d.preferredTiming !== "scheduled" || !!d.preferredAt, {
    message: "Please choose a preferred date and time.",
    path: ["preferredAt"],
  });

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contractorSelect = {
    contractor: { select: { name: true, company: true, phone: true } },
  };

  if (session.role === "admin") {
    const tickets = await db.ticket.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        tenant: { select: { name: true, unit: true, email: true } },
        ...contractorSelect,
      },
    });
    return NextResponse.json({ tickets });
  }

  if (session.role === "contractor") {
    // Jobs this contractor was offered but no one has claimed yet.
    const available = await db.ticket.findMany({
      where: {
        contractorId: null,
        assignmentStatus: "offered",
        offers: { some: { contractorId: session.contractorId } },
      },
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { unit: true } } },
    });
    // Jobs this contractor owns.
    const mine = await db.ticket.findMany({
      where: { contractorId: session.contractorId },
      orderBy: { updatedAt: "desc" },
      include: { tenant: { select: { name: true, unit: true, phone: true } } },
    });
    return NextResponse.json({ available, mine });
  }

  const tickets = await db.ticket.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    include: contractorSelect,
  });
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "tenant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { preferredTiming, preferredAt } = parsed.data;
  const scheduledAt = preferredTiming === "scheduled" && preferredAt ? new Date(preferredAt) : null;

  const ticket = await db.ticket.create({
    data: {
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      urgency: parsed.data.urgency,
      preferredTiming,
      preferredAt: scheduledAt,
      tenantId: session.tenantId,
    },
  });

  const tenant = await db.tenant.findUnique({ where: { id: session.tenantId } });
  if (tenant) {
    const preferred = preferredTimingText(preferredTiming, scheduledAt ? scheduledAt.toISOString() : null);
    await sendEmail({
      to: adminEmail(),
      subject: `[${parsed.data.urgency.toUpperCase()}] New ticket from Unit ${tenant.unit}: ${parsed.data.title}`,
      text: `Tenant: ${tenant.name} (Unit ${tenant.unit})\nCategory: ${parsed.data.category}\nUrgency: ${parsed.data.urgency}\nPreferred visit: ${preferred}\n\n${parsed.data.description}`,
    });
  }

  return NextResponse.json({ ticket });
}
