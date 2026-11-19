import "server-only";
import { formatPrice, type SiteSettings } from "./data";
import { orderNotifyTo, sendMail } from "./mail";

export type OrderMail = {
  id: number;
  number: string;
  name: string;
  phone: string;
  email: string;
  zone: string;
  address: string;
  comment: string;
  payment: string;
  items: { name: string; qty: number; price: number; image: string | null }[];
  subtotal: number;
  discount: number;
  promoCode: string | null;
  delivery: number;
  total: number;
};

const C = { dark: "#1f2937", blue: "#3b82f6", gray: "#64748b", line: "#e2e8f0", card: "#f1f5f9" };
const FONT = `"Noto Sans Georgian", "Segoe UI", Roboto, Arial, sans-serif`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const abs = (origin: string, u: string | null) => (!u ? "" : u.startsWith("/") ? origin + u : u);
const ship = (n: number) => (n === 0 ? "უფასო" : formatPrice(n));
const tel = (p: string) => `tel:+995${p.replace(/\D/g, "").replace(/^995/, "")}`;

function layout(origin: string, title: string, body: string) {
  return `<!doctype html><html lang="ka"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.card};font-family:${FONT};color:${C.dark};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;">
<tr><td style="background:${C.dark};padding:22px 28px;border-bottom:4px solid ${C.blue};">
<img src="${origin}/brand/logo-on-dark.png" alt="SportHub" width="160" style="display:block;width:160px;height:auto;border:0;">
</td></tr>
<tr><td style="padding:28px;">${body}</td></tr>
</table>
</td></tr></table></body></html>`;
}

function itemsTable(origin: string, o: OrderMail) {
  const rows = o.items
    .map(
      (i) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${C.line};width:56px;vertical-align:middle;">
${i.image ? `<img src="${esc(abs(origin, i.image))}" alt="" width="48" height="48" style="display:block;width:48px;height:48px;object-fit:contain;background:${C.card};border:0;">` : ""}
</td>
<td style="padding:12px 10px;border-bottom:1px solid ${C.line};font-size:14px;line-height:20px;vertical-align:middle;">${esc(i.name)}<br><span style="color:${C.gray};font-size:13px;">${i.qty} x ${formatPrice(i.price)}</span></td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font-size:14px;font-weight:700;white-space:nowrap;vertical-align:middle;">${formatPrice(i.price * i.qty)}</td>
</tr>`,
    )
    .join("");
  const line = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:6px 0;font-size:${strong ? 16 : 14}px;${strong ? "font-weight:800;" : `color:${C.gray};`}">${label}</td><td align="right" style="padding:6px 0;font-size:${strong ? 18 : 14}px;font-weight:${strong ? 800 : 600};${strong ? `color:${C.blue};` : ""}white-space:nowrap;">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
${line("პროდუქტები", formatPrice(o.subtotal))}
${o.discount > 0 ? line(`ფასდაკლება${o.promoCode ? ` (${esc(o.promoCode)})` : ""}`, `-${formatPrice(o.discount)}`) : ""}
${line(`მიწოდება (${esc(o.zone)})`, ship(o.delivery))}
<tr><td colspan="2" style="border-top:1px solid ${C.line};padding-top:4px;"></td></tr>
${line("სულ", formatPrice(o.total), true)}
</table>`;
}

const field = (label: string, value: string) =>
  `<tr><td style="padding:5px 14px 5px 0;color:${C.gray};font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:5px 0;font-size:14px;font-weight:600;">${value}</td></tr>`;

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:${C.blue};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 24px;">${label}</a>`;

/** To the shop: everything needed to call the customer and prepare the order. */
function adminMail(origin: string, o: OrderMail) {
  const body = `<h1 style="margin:0 0 4px;font-size:22px;">ახალი შეკვეთა ${esc(o.number)}</h1>
<p style="margin:0 0 22px;color:${C.gray};font-size:14px;">ჯამი: <strong style="color:${C.dark};">${formatPrice(o.total)}</strong></p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
${field("მყიდველი", esc(o.name))}
${field("ტელეფონი", `<a href="${tel(o.phone)}" style="color:${C.blue};text-decoration:none;">${esc(o.phone)}</a>`)}
${o.email ? field("ელ-ფოსტა", `<a href="mailto:${esc(o.email)}" style="color:${C.blue};text-decoration:none;">${esc(o.email)}</a>`) : ""}
${field("მიწოდება", esc(o.zone))}
${field("მისამართი", esc(o.address))}
${field("გადახდა", esc(o.payment))}
${o.comment ? field("კომენტარი", esc(o.comment)) : ""}
</table>
${itemsTable(origin, o)}
<p style="margin:26px 0 0;">${button(`${origin}/admin/orders/${o.id}`, "შეკვეთის გახსნა ადმინში")}</p>`;
  const text = [
    `ახალი შეკვეთა ${o.number}`,
    `მყიდველი: ${o.name}`,
    `ტელეფონი: ${o.phone}`,
    o.email ? `ელ-ფოსტა: ${o.email}` : null,
    `მიწოდება: ${o.zone}`,
    `მისამართი: ${o.address}`,
    `გადახდა: ${o.payment}`,
    o.comment ? `კომენტარი: ${o.comment}` : null,
    "",
    ...o.items.map((i) => `${i.name}: ${i.qty} x ${formatPrice(i.price)}`),
    "",
    `მიწოდება: ${ship(o.delivery)}`,
    `სულ: ${formatPrice(o.total)}`,
    "",
    `${origin}/admin/orders/${o.id}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { subject: `ახალი შეკვეთა ${o.number}, ${formatPrice(o.total)}`, html: layout(origin, `ახალი შეკვეთა ${o.number}`, body), text };
}

/** To the buyer: confirmation with the order, next steps and how to reach the shop. */
function customerMail(origin: string, o: OrderMail, s: SiteSettings) {
  const phone = s.phones[0];
  const body = `<h1 style="margin:0 0 6px;font-size:22px;">მადლობა, შეკვეთა მიღებულია</h1>
<p style="margin:0 0 22px;color:${C.gray};font-size:14px;">${esc(o.name)}, თქვენი შეკვეთის ნომერია <strong style="color:${C.dark};">${esc(o.number)}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};margin-bottom:24px;">
<tr><td style="padding:16px 18px;font-size:14px;line-height:22px;">
<strong>1. დადასტურება.</strong> მენეჯერი დაგიკავშირდებათ ${phone ? `ნომრიდან ${esc(phone)}` : "ტელეფონით"} და შეგითანხმებთ მიწოდების დღესა და დროს.<br>
<strong>2. მიწოდება.</strong> შეკვეთა დამუშავდება 2 სამუშაო დღეში და მოგივათ დამუშავებიდან 2-3 სამუშაო დღეში.<br>
<strong>3. გადახდა.</strong> ${esc(o.payment)}.
</td></tr></table>
${itemsTable(origin, o)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">
${field("მიწოდება", esc(o.zone))}
${field("მისამართი", esc(o.address))}
</table>
<p style="margin:26px 0 0;font-size:13px;line-height:20px;color:${C.gray};">
კითხვების შემთხვევაში დაგვიკავშირდით${phone ? `: <a href="${tel(phone)}" style="color:${C.blue};text-decoration:none;font-weight:700;">${esc(phone)}</a>` : ""}${s.email ? `, <a href="mailto:${esc(s.email)}" style="color:${C.blue};text-decoration:none;font-weight:700;">${esc(s.email)}</a>` : ""}.<br>
<a href="${origin}/terms" style="color:${C.gray};">წესები და პირობები</a> &nbsp; <a href="${origin}/delivery" style="color:${C.gray};">მიწოდების პოლიტიკა</a> &nbsp; <a href="${origin}/privacy" style="color:${C.gray};">კონფიდენციალურობა</a>
</p>`;
  const text = [
    `მადლობა, შეკვეთა მიღებულია. შეკვეთის ნომერი: ${o.number}`,
    "",
    "მენეჯერი დაგიკავშირდებათ და შეგითანხმებთ მიწოდების დღესა და დროს.",
    "შეკვეთა დამუშავდება 2 სამუშაო დღეში და მოგივათ დამუშავებიდან 2-3 სამუშაო დღეში.",
    `გადახდა: ${o.payment}`,
    "",
    ...o.items.map((i) => `${i.name}: ${i.qty} x ${formatPrice(i.price)}`),
    `მიწოდება (${o.zone}): ${ship(o.delivery)}`,
    `სულ: ${formatPrice(o.total)}`,
    "",
    `მისამართი: ${o.address}`,
    phone ? `ტელეფონი: ${phone}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { subject: `შეკვეთა ${o.number} მიღებულია`, html: layout(origin, `შეკვეთა ${o.number}`, body), text };
}

/** Sends the shop notification and, if the buyer left an email, the confirmation. */
export async function sendOrderEmails(origin: string, o: OrderMail, settings: SiteSettings) {
  const shopTo = orderNotifyTo();
  const jobs: Promise<boolean>[] = [];
  if (shopTo.length) jobs.push(sendMail({ to: shopTo, ...adminMail(origin, o), replyTo: o.email || undefined }));
  if (o.email) jobs.push(sendMail({ to: o.email, ...customerMail(origin, o, settings), replyTo: settings.email || undefined }));
  await Promise.all(jobs);
}
