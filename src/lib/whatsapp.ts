// WhatsApp sending via Twilio's WhatsApp API. Mirrors the email.ts pattern:
// when Twilio env vars are unset, messages log to the server console so the
// whole flow is testable in dev without an account.
//
// Production setup (see README):
//   TWILIO_ACCOUNT_SID  — from https://console.twilio.com
//   TWILIO_AUTH_TOKEN   — same page
//   TWILIO_WHATSAPP_FROM — your WhatsApp-enabled number, e.g. "+14155238886"
//                          (the Twilio sandbox number works for testing)

export type WhatsAppMessage = {
  to: string;   // tenant phone in any common format
  body: string;
};

/** Normalize a phone string to E.164, assuming US (+1) for 10-digit numbers. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export async function sendWhatsApp(
  msg: WhatsAppMessage,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM;

  const to = normalizePhone(msg.to);
  if (!to) return { ok: false, error: "invalid phone number" };

  if (!sid || !token || !fromRaw) {
    console.log("\n=== WHATSAPP (dev mode, Twilio keys not set) ===");
    console.log("To:", to);
    console.log(msg.body);
    console.log("================================================\n");
    return { ok: true, id: "dev-console" };
  }

  const from = fromRaw.startsWith("whatsapp:") ? fromRaw : `whatsapp:${fromRaw}`;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: msg.body }),
      },
    );
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) {
      return { ok: false, error: (data.message as string) ?? `Twilio error ${res.status}` };
    }
    return { ok: true, id: data.sid as string };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}
