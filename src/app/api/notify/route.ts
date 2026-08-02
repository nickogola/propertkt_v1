import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

const schema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  recipientIds: z.array(z.string().min(1)).min(1, "Pick at least one tenant."),
  channels: z.array(z.enum(["email", "whatsapp"])).min(1, "Pick at least one channel."),
});

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { subject, body, recipientIds, channels } = parsed.data;
  const tenants = await db.tenant.findMany({ where: { id: { in: recipientIds } } });
  if (tenants.length === 0) {
    return NextResponse.json({ error: "No matching tenants found." }, { status: 404 });
  }

  const results: Record<string, { sent: number; failures: string[] }> = {};

  if (channels.includes("email")) {
    const r = { sent: 0, failures: [] as string[] };
    for (const t of tenants) {
      try {
        await sendEmail({ to: t.email, subject, text: body });
        r.sent++;
      } catch {
        r.failures.push(t.name);
      }
    }
    results.email = r;
  }

  if (channels.includes("whatsapp")) {
    const r = { sent: 0, failures: [] as string[] };
    for (const t of tenants) {
      if (!t.phone) {
        r.failures.push(t.name);
        continue;
      }
      try {
        await sendWhatsApp({ to: t.phone, body: `${subject}\n\n${body}` });
        r.sent++;
      } catch {
        r.failures.push(t.name);
      }
    }
    results.whatsapp = r;
  }

  const sentCount = Object.values(results).reduce((acc, r) => acc + r.sent, 0);
  await db.notification.create({
    data: {
      subject,
      body,
      recipients: JSON.stringify(recipientIds),
      channels: JSON.stringify(channels),
      sentCount,
    },
  });

  return NextResponse.json({ total: tenants.length, results });
}
