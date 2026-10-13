import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../../config.js";
import { query } from "../../db.js";
import { contactMessage, newOrderAlert, newsletterWelcome, orderConfirmation, orderStatusUpdate, type Mail, type MailOrder } from "./templates.js";

const RETRY_DELAYS_MS = config.NODE_ENV === "test" ? [0, 0] : [2_000, 10_000];

let transport: Transporter | null = null;

function getTransport(): Transporter {
  transport ??= config.SMTP_HOST
    ? nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return transport;
}

export function setTransport(t: Transporter | null) {
  transport = t;
}

const inFlight = new Set<Promise<unknown>>();

function track<T>(p: Promise<T>): Promise<T> {
  inFlight.add(p);
  void p.finally(() => inFlight.delete(p));
  return p;
}

export async function drainMail() {
  while (inFlight.size) await Promise.allSettled([...inFlight]);
}

async function deliver(mail: Mail) {
  for (let attempt = 0; ; attempt++) {
    try {
      await getTransport().sendMail({ from: config.MAIL_FROM, ...mail });
      if (!config.SMTP_HOST) console.log(`[mail not sent, SMTP_HOST unset] to=${mail.to} subject="${mail.subject}"`);
      return;
    } catch (e) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) return console.error(`mail to ${mail.to} failed:`, (e as Error).message);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// Fire and forget: a mail problem must never fail an order or a request.
export function sendMail(mail: Mail | null) {
  if (mail) track(deliver(mail));
}

async function loadMailOrder(orderId: number): Promise<MailOrder | null> {
  const rows = await query(
    `SELECT o.order_number, o.status, o.customer_name, o.email, o.mobile, o.governorate, o.city, o.address, o.apartment, o.notes,
            o.user_id IS NOT NULL AS has_account, o.promo_code, o.subtotal_cents, o.discount_cents, o.shipping_cents, o.total_cents,
            COALESCE((SELECT json_agg(json_build_object('name', i.product_name, 'color', i.color, 'size', i.size, 'quantity', i.quantity,
                      'unitPriceCents', i.unit_price_cents, 'imageUrl', i.image_url) ORDER BY i.id)
                      FROM order_items i WHERE i.order_id = o.id), '[]') AS items
     FROM orders o WHERE o.id = $1`,
    [orderId],
  );
  const o = rows[0];
  if (!o) return null;
  return {
    orderNumber: o.order_number, status: o.status, customerName: o.customer_name, email: o.email, mobile: o.mobile,
    governorate: o.governorate, city: o.city, address: o.address, apartment: o.apartment, notes: o.notes,
    hasAccount: o.has_account, promoCode: o.promo_code, subtotalCents: o.subtotal_cents, discountCents: o.discount_cents,
    shippingCents: o.shipping_cents, totalCents: o.total_cents, items: o.items,
  };
}

async function withOrder(orderId: number, build: (order: MailOrder) => void) {
  try {
    const order = await loadMailOrder(orderId);
    if (order) build(order);
  } catch (e) {
    console.error("order email failed:", (e as Error).message);
  }
}

export const notifyOrderPlaced = (orderId: number) =>
  track(
    withOrder(orderId, (order) => {
      sendMail(orderConfirmation(order));
      sendMail(newOrderAlert(order));
    }),
  );

export const notifyOrderStatus = (orderId: number) => track(withOrder(orderId, (order) => sendMail(orderStatusUpdate(order))));

export const notifyContact = (m: { name: string; email: string; subject: string; message: string }) => sendMail(contactMessage(m));
export const notifyNewsletter = (email: string) => sendMail(newsletterWelcome(email));
