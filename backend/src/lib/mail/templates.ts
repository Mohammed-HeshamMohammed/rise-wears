import { config } from "../../config.js";
import { formatEgp } from "../money.js";

export interface MailOrder {
  orderNumber: string;
  status: string;
  customerName: string;
  email: string;
  mobile: string;
  governorate: string;
  city: string;
  address: string;
  apartment: string;
  notes: string;
  hasAccount: boolean;
  promoCode: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  items: { name: string; color: string; size: string; quantity: number; unitPriceCents: number; imageUrl: string }[];
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

const INK = "#111111";
const MUTED = "#666666";
const LINE = "#e5e5e5";
const SOFT = "#f5f5f5";
const HEADING = "'Bebas Neue', Impact, 'Arial Narrow', Arial, sans-serif";
const BODY = "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const site = (path = "") => `${config.SITE_URL.replace(/\/$/, "")}${path}`;
const absolute = (url: string) => (url.startsWith("http") ? url : site(url.startsWith("/") ? url : `/${url}`));

const button = (label: string, href: string) =>
  `<a href="${href}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;font-family:${BODY};font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;padding:15px 34px;">${escapeHtml(label)}</a>`;

const heading = (text: string) =>
  `<h1 style="margin:0 0 14px;font-family:${HEADING};font-size:40px;line-height:1.05;font-weight:400;letter-spacing:1px;color:${INK};text-transform:uppercase;">${escapeHtml(text)}</h1>`;

const paragraph = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${BODY};font-size:15px;line-height:1.7;color:${MUTED};">${html}</p>`;

/** The site's look: black promo strip, white header with logo, white card, black footer. */
function layout(preheader: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;600&display=swap" rel="stylesheet">
<title>RISE</title></head>
<body style="margin:0;padding:0;background:${SOFT};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;">
    <tr><td align="center" style="background:${INK};color:#ffffff;font-family:${BODY};font-size:11px;font-weight:600;letter-spacing:2px;padding:9px 12px;">BUY 2 GET 50% OFF THE 3RD!</td></tr>
    <tr><td align="center" style="padding:26px 0 22px;border-bottom:1px solid ${LINE};">
      <a href="${site()}"><img src="${site("/images/logo.png")}" alt="RISE" width="54" style="display:block;border:0;height:auto;"></a>
    </td></tr>
    <tr><td style="padding:38px 36px 34px;">${body}</td></tr>
    <tr><td align="center" style="background:${INK};padding:26px 24px;">
      <div style="font-family:${HEADING};font-size:22px;letter-spacing:3px;color:#ffffff;">RISE ABOVE.</div>
      <div style="font-family:${BODY};font-size:12px;line-height:1.8;color:#bbbbbb;margin-top:8px;">© 2026 RISE Apparel. All Rights Reserved.<br>Questions? <a href="mailto:${config.OWNER_EMAIL}" style="color:#ffffff;">${escapeHtml(config.OWNER_EMAIL)}</a></div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function itemsTable(o: MailOrder): string {
  const rows = o.items
    .map(
      (i) => `<tr>
      <td width="64" style="padding:12px 0;border-bottom:1px solid ${LINE};"><img src="${absolute(i.imageUrl || "/images/logo.png")}" alt="" width="56" style="display:block;border:0;background:${SOFT};"></td>
      <td style="padding:12px 12px;border-bottom:1px solid ${LINE};font-family:${BODY};font-size:14px;color:${INK};"><strong>${escapeHtml(i.name)}</strong><br><span style="color:${MUTED};font-size:12px;">${escapeHtml(i.color)} · Size ${escapeHtml(i.size)} · Qty ${i.quantity}</span></td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid ${LINE};font-family:${BODY};font-size:14px;color:${INK};white-space:nowrap;">${formatEgp(i.unitPriceCents * i.quantity)}</td>
    </tr>`,
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:5px 0;font-family:${BODY};font-size:14px;color:${bold ? INK : MUTED};${bold ? "font-weight:700;" : ""}">${label}</td><td align="right" style="padding:5px 0;font-family:${BODY};font-size:14px;color:${INK};${bold ? "font-weight:700;font-size:16px;" : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;">${rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 24px;">
    ${line("Subtotal", formatEgp(o.subtotalCents))}
    ${line(`Discount${o.promoCode ? ` (${escapeHtml(o.promoCode)})` : ""}`, `-${formatEgp(o.discountCents)}`)}
    ${line("Shipping", formatEgp(o.shippingCents))}
    <tr><td colspan="2" style="border-top:1px solid ${INK};padding-top:6px;"></td></tr>
    ${line("Total (cash on delivery)", formatEgp(o.totalCents), true)}
  </table>`;
}

function deliveryBlock(o: MailOrder): string {
  const lines = [o.customerName, `${o.address}${o.apartment ? `, ${o.apartment}` : ""}`, `${o.city}, ${o.governorate}`, o.mobile];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};margin:0 0 26px;"><tr><td style="padding:18px 20px;font-family:${BODY};font-size:14px;line-height:1.7;color:${INK};">
    <div style="font-family:${HEADING};font-size:20px;letter-spacing:1px;margin-bottom:4px;">DELIVERY</div>${lines.map(escapeHtml).join("<br>")}
    ${o.notes ? `<br><span style="color:${MUTED};">Notes: ${escapeHtml(o.notes)}</span>` : ""}</td></tr></table>`;
}

const orderLink = (o: MailOrder) =>
  o.hasAccount ? button("View my order", site(`/account/orders/${o.orderNumber}`)) : button("Continue shopping", site("/shop"));

const plainItems = (o: MailOrder) =>
  o.items.map((i) => `- ${i.name} (${i.color}, ${i.size}) x${i.quantity}  ${formatEgp(i.unitPriceCents * i.quantity)}`).join("\n");

const plainTotals = (o: MailOrder) =>
  `Subtotal: ${formatEgp(o.subtotalCents)}\nDiscount: -${formatEgp(o.discountCents)}\nShipping: ${formatEgp(o.shippingCents)}\nTotal (cash on delivery): ${formatEgp(o.totalCents)}`;

export function orderConfirmation(o: MailOrder): Mail {
  const first = escapeHtml(o.customerName.split(" ")[0] ?? "there");
  return {
    to: o.email,
    subject: `Your RISE order ${o.orderNumber}`,
    html: layout(
      `We got your order ${o.orderNumber}.`,
      `${heading("Thank you.")}
       ${paragraph(`Hi ${first}, your order <strong style="color:${INK};">${escapeHtml(o.orderNumber)}</strong> is in. We'll contact you shortly to confirm it. Delivery takes 2–4 business days and you pay on delivery.`)}
       ${itemsTable(o)}${deliveryBlock(o)}<div align="center">${orderLink(o)}</div>`,
    ),
    text: `Thank you, ${o.customerName}.\n\nYour order ${o.orderNumber} is in. We'll contact you shortly to confirm it. Delivery takes 2-4 business days, pay on delivery.\n\n${plainItems(o)}\n\n${plainTotals(o)}\n\nDeliver to: ${o.address}, ${o.city}, ${o.governorate}\n\nRISE ABOVE.`,
  };
}

export function newOrderAlert(o: MailOrder): Mail {
  return {
    to: config.OWNER_EMAIL,
    replyTo: o.email,
    subject: `New order ${o.orderNumber} · ${formatEgp(o.totalCents)}`,
    html: layout(
      `New order from ${o.customerName}`,
      `${heading("New order")}
       ${paragraph(`<strong style="color:${INK};">${escapeHtml(o.orderNumber)}</strong> from ${escapeHtml(o.customerName)} · <a href="mailto:${escapeHtml(o.email)}" style="color:${INK};">${escapeHtml(o.email)}</a>`)}
       ${itemsTable(o)}${deliveryBlock(o)}<div align="center">${button("Open in dashboard", site("/admin/orders"))}</div>`,
    ),
    text: `New order ${o.orderNumber} from ${o.customerName} (${o.email}, ${o.mobile})\n\n${plainItems(o)}\n\n${plainTotals(o)}\n\nDeliver to: ${o.address}, ${o.city}, ${o.governorate}\n${o.notes ? `Notes: ${o.notes}\n` : ""}\n${site("/admin/orders")}`,
  };
}

const STATUS_COPY: Record<string, { subject: string; title: string; message: string } | undefined> = {
  confirmed: { subject: "is confirmed", title: "Confirmed.", message: "We've confirmed your order and are getting it ready." },
  shipped: { subject: "is on its way", title: "On its way.", message: "Your order has shipped. Keep your phone close, the courier will call you before delivery." },
  delivered: { subject: "was delivered", title: "Delivered.", message: "Your order has been delivered. We hope you love it. Rise above." },
  canceled: { subject: "was canceled", title: "Canceled.", message: "Your order has been canceled. If this wasn't expected, just reply to this email and we'll help." },
  returned: { subject: "was returned", title: "Returned.", message: "We've recorded the return of your order. Reply to this email if you have any questions." },
};

export function orderStatusUpdate(o: MailOrder): Mail | null {
  const copy = STATUS_COPY[o.status];
  if (!copy) return null;
  return {
    to: o.email,
    subject: `Your RISE order ${o.orderNumber} ${copy.subject}`,
    html: layout(
      `Order ${o.orderNumber} ${copy.subject}.`,
      `${heading(copy.title)}
       ${paragraph(`Hi ${escapeHtml(o.customerName.split(" ")[0] ?? "there")}, ${escapeHtml(copy.message)}`)}
       ${paragraph(`Order <strong style="color:${INK};">${escapeHtml(o.orderNumber)}</strong> · ${formatEgp(o.totalCents)}`)}
       <div align="center" style="margin-top:24px;">${orderLink(o)}</div>`,
    ),
    text: `${copy.title}\n\n${copy.message}\n\nOrder ${o.orderNumber} · ${formatEgp(o.totalCents)}\n${o.hasAccount ? site(`/account/orders/${o.orderNumber}`) : site("/shop")}`,
  };
}

export function contactMessage(m: { name: string; email: string; subject: string; message: string }): Mail {
  return {
    to: config.OWNER_EMAIL,
    replyTo: m.email,
    subject: `Contact form: ${m.subject || "New message"} (${m.name})`,
    html: layout(
      `Message from ${m.name}`,
      `${heading("New message")}
       ${paragraph(`From <strong style="color:${INK};">${escapeHtml(m.name)}</strong> · <a href="mailto:${escapeHtml(m.email)}" style="color:${INK};">${escapeHtml(m.email)}</a>${m.subject ? `<br>Subject: ${escapeHtml(m.subject)}` : ""}`)}
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};margin:0 0 8px;"><tr><td style="padding:18px 20px;font-family:${BODY};font-size:14px;line-height:1.7;color:${INK};white-space:pre-wrap;">${escapeHtml(m.message)}</td></tr></table>
       ${paragraph("Reply to this email to answer them directly.")}`,
    ),
    text: `From: ${m.name} <${m.email}>\nSubject: ${m.subject}\n\n${m.message}`,
  };
}

export function newsletterWelcome(email: string): Mail {
  return {
    to: email,
    subject: "Welcome to the movement",
    html: layout(
      "You're on the list.",
      `${heading("You're in.")}
       ${paragraph("Thanks for joining RISE. You'll be the first to hear about new drops, restocks and exclusive offers.")}
       <div align="center" style="margin-top:24px;">${button("Shop the collection", site("/shop"))}</div>`,
    ),
    text: `You're in.\n\nThanks for joining RISE. You'll be the first to hear about new drops, restocks and exclusive offers.\n\n${site("/shop")}`,
  };
}
