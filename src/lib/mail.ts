import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing mail over SMTP (the shop's own mailbox, e.g. info@sporthub.ge).
 * Without SMTP_HOST / SMTP_USER / SMTP_PASS mail is skipped (local dev, previews).
 */
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

export const mailEnabled = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transport: Transporter | null = null;
const smtp = () => {
  const port = Number(SMTP_PORT) || 465;
  return (transport ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465: TLS from the start; 587: STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  }));
};

export type Mail = { to: string | string[]; subject: string; html: string; text: string; replyTo?: string };

/** Sends one email; logs and swallows errors so a mail problem never breaks the caller. */
export async function sendMail(mail: Mail) {
  if (!mailEnabled) return false;
  try {
    await smtp().sendMail({ from: MAIL_FROM || SMTP_USER, ...mail });
    return true;
  } catch (e) {
    console.error("sendMail failed:", mail.subject, e);
    return false;
  }
}

/** Addresses for new-order notifications (ORDER_NOTIFY_TO, comma separated). */
export const orderNotifyTo = () =>
  (process.env.ORDER_NOTIFY_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
