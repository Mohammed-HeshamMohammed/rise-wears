import request from "supertest";
import type { Transporter } from "nodemailer";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const { createApp } = await import("../src/app.js");
const { seed } = await import("../src/seed.js");
const { pool } = await import("../src/db.js");
const { drainMail, setTransport } = await import("../src/lib/mail/index.js");
const { orderStatusUpdate, escapeHtml } = await import("../src/lib/mail/templates.js");

const api = () => request(createApp());
const as = (uid: string) => ({ Authorization: `Bearer dev:${uid}:${uid}@example.com` });

let sent: any[] = [];
let failing = false;
const capture = {
  sendMail: async (m: any) => {
    if (failing) throw new Error("smtp down");
    sent.push(m);
  },
} as unknown as Transporter;

let sweatshirt: any;
const order = (email: string, name = "Mona Ali") => ({
  items: [{ productId: sweatshirt.id, size: "L", quantity: 1 }],
  governorate: "Cairo",
  customer: { name, email, mobile: "01000000000", city: "Maadi", address: "5 Road 9", apartment: "", notes: "" },
});

beforeAll(async () => {
  await seed();
  sweatshirt = (await api().get("/api/products/rise-black-sweatshirt")).body;
  await pool.query("UPDATE product_variants SET stock = 50 WHERE product_id = $1", [sweatshirt.id]);
});
beforeEach(() => {
  sent = [];
  failing = false;
  setTransport(capture);
});
afterAll(async () => {
  await drainMail();
  await pool.end();
});

describe("order emails", () => {
  it("sends the customer a confirmation and the owner an alert", async () => {
    const res = await api().post("/api/orders").send(order("mona@example.com"));
    expect(res.status).toBe(201);
    await drainMail();

    const toCustomer = sent.find((m) => m.to === "mona@example.com");
    const toOwner = sent.find((m) => m.to === "inquiries@rise-wear.store");
    expect(toCustomer.subject).toBe(`Your RISE order ${res.body.orderNumber}`);
    expect(toCustomer.html).toContain("Rise Black Sweatshirt");
    expect(toCustomer.html).toContain("EGP 1,299.99");
    expect(toCustomer.html).toContain("Continue shopping");
    expect(toCustomer.text).toContain(res.body.orderNumber);
    expect(toOwner.subject).toContain(res.body.orderNumber);
    expect(toOwner.replyTo).toBe("mona@example.com");
  });

  it("links logged-in customers to their order page", async () => {
    const res = await api().post("/api/orders").set(as("lina")).send(order("lina@example.com"));
    await drainMail();
    const mail = sent.find((m) => m.to === "lina@example.com");
    expect(mail.html).toContain(`/account/orders/${res.body.orderNumber}`);
  });

  it("escapes customer-supplied text so it can't inject HTML", async () => {
    await api().post("/api/orders").send(order("x@example.com", `<script>alert(1)</script>`));
    await drainMail();
    const html = sent.find((m) => m.to === "inquiries@rise-wear.store").html as string;
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("emails the customer when they cancel", async () => {
    const placed = await api().post("/api/orders").set(as("omar")).send(order("omar@example.com"));
    await drainMail();
    sent = [];
    await api().post(`/api/me/orders/${placed.body.orderNumber}/cancel`).set(as("omar")).expect(200);
    await drainMail();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("omar@example.com");
    expect(sent[0].subject).toBe(`Your RISE order ${placed.body.orderNumber} was canceled`);
  });

  it("never fails an order because the mail server is down", async () => {
    failing = true;
    const res = await api().post("/api/orders").send(order("down@example.com"));
    expect(res.status).toBe(201);
    await drainMail();
    expect(sent).toHaveLength(0);
  });
});

describe("status emails", () => {
  const base = {
    orderNumber: "RISE-1", customerName: "Mona Ali", email: "m@example.com", mobile: "0", governorate: "Cairo", city: "x", address: "y",
    apartment: "", notes: "", hasAccount: false, promoCode: null, subtotalCents: 100, discountCents: 0, shippingCents: 0, totalCents: 100, items: [],
  };

  it("has copy for every customer-facing status and none for pending", () => {
    for (const status of ["confirmed", "shipped", "delivered", "canceled", "returned"]) {
      const mail = orderStatusUpdate({ ...base, status });
      expect(mail?.subject).toContain("RISE-1");
      expect(mail?.html).toContain("RISE ABOVE.");
    }
    expect(orderStatusUpdate({ ...base, status: "pending" })).toBeNull();
  });

  it("escapes html", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});

describe("contact and newsletter emails", () => {
  it("forwards contact messages to the owner with the sender as reply-to", async () => {
    await api().post("/api/contact").send({ name: "Sara", email: "sara@example.com", subject: "Sizing", message: "Is the hoodie true to size?" }).expect(201);
    await drainMail();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("inquiries@rise-wear.store");
    expect(sent[0].replyTo).toBe("sara@example.com");
    expect(sent[0].html).toContain("Is the hoodie true to size?");
  });

  it("welcomes a new subscriber once, not on repeat sign-ups", async () => {
    await api().post("/api/newsletter").send({ email: "welcome@example.com" }).expect(201);
    await api().post("/api/newsletter").send({ email: "welcome@example.com" }).expect(201);
    await drainMail();
    expect(sent.filter((m) => m.to === "welcome@example.com")).toHaveLength(1);
  });
});
