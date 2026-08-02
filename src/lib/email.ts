import { Resend } from "resend";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

let resendClient: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; id?: string; error?: string }> {
  const from = process.env.EMAIL_FROM ?? "ProperTkt <onboarding@resend.dev>";
  const client = getClient();

  if (!client) {
    console.log("\n=== EMAIL (dev mode, Resend key not set) ===");
    console.log("From:", from);
    console.log("To:", msg.to);
    console.log("Subject:", msg.subject);
    console.log(msg.text);
    console.log("=============================================\n");
    return { ok: true, id: "dev-console" };
  }

  try {
    const { data, error } = await client.emails.send({
      from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}

export function magicLinkEmail(appUrl: string, token: string) {
  const url = `${appUrl}/tenant/verify?token=${encodeURIComponent(token)}`;
  return {
    subject: "Your ProperTkt sign-in link",
    text: `Click this link to sign in (expires in 15 minutes):\n\n${url}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Click the link below to sign in to ProperTkt. It expires in 15 minutes.</p><p><a href="${url}">Sign in</a></p><p>If you didn't request this, you can ignore this email.</p>`,
  };
}
