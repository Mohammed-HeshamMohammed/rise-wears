import request from "supertest";
import { authenticator } from "otplib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { createApp } = await import("../src/app.js");
const { seed } = await import("../src/seed.js");
const { pool } = await import("../src/db.js");

const app = createApp();
const api = () => request(app);
const as = (uid: string, email = `${uid}@example.com`) => ({ Authorization: `Bearer dev:${uid}:${email}` });
const adminAuth = as("admin1", "admin@rise.test");
// A used code can't be reused, so tests ask for codes from later 30s steps.
const codeAt = (secret: string, steps = 0) => authenticator.clone({ epoch: Date.now() + steps * 30_000 }).generate(secret);

const customer = {
  name: "Test Buyer", email: "buyer@example.com", mobile: "01000000000",
  city: "Nasr City", address: "12 Test Street", apartment: "", notes: "",
};

let products: any[];
const bySlug = (slug: string) => products.find((p) => p.slug === slug);
const stockOf = async (slug: string, size: string) => {
  const res = await api().get(`/api/products/${slug}`);
  return res.body.sizes.find((s: any) => s.size === size).stock as number;
};

beforeAll(async () => {
  await seed();
  products = (await api().get("/api/products")).body;
});
afterAll(() => pool.end());

describe("catalogue", () => {
  it("lists the 4 migrated products with sizes and images", () => {
    expect(products).toHaveLength(4);
    const hoodie = bySlug("rise-black-hoodie");
    expect(hoodie.priceCents).toBe(119999);
    expect(hoodie.sizes.map((s: any) => s.size)).toEqual(["S", "M", "L", "XL"]);
    expect(hoodie.images[0].url).toBe("/images/products/blackhoodie/model.webp");
    expect(hoodie.images.map((i: any) => i.url)).toContain("/images/products/blackhoodie/1.jpg");
    expect(hoodie.category.slug).toBe("tops");
  });
  it("marks a product sold out when every size is at 0", () => {
    expect(bySlug("rise-grey-sweatpants").soldOut).toBe(true);
    expect(bySlug("rise-black-hoodie").soldOut).toBe(false);
  });
  it("filters by category and serves a product by slug", async () => {
    const pants = (await api().get("/api/products?category=pants")).body;
    expect(pants.map((p: any) => p.slug).sort()).toEqual(["rise-black-sweatpants", "rise-grey-sweatpants"]);
    expect((await api().get("/api/products/nope")).status).toBe(404);
  });
  it("serves the announcement bar and shipping rates", async () => {
    expect((await api().get("/api/announcements")).body[0].text).toBe("BUY 2 GET 50% OFF THE 3RD!");
    const rates = (await api().get("/api/shipping-rates")).body;
    expect(rates).toHaveLength(27);
    expect(rates.find((r: any) => r.governorate === "Cairo").costCents).toBe(10000);
    expect(rates.find((r: any) => r.governorate === "Aswan").costCents).toBe(15000);
  });
});

describe("quote", () => {
  const item = (slug: string, size: string, quantity = 1) => ({ productId: bySlug(slug).id, size, quantity });

  it("applies buy-2-get-50%-off-3rd on the server", async () => {
    const res = await api().post("/api/checkout/quote").send({
      items: [item("rise-black-hoodie", "L"), item("rise-black-sweatpants", "M"), item("rise-black-sweatshirt", "M")],
      governorate: "Cairo",
    });
    expect(res.status).toBe(200);
    expect(res.body.subtotalCents).toBe(119999 + 139999 + 119999);
    expect(res.body.discountCents).toBe(Math.round(119999 / 2));
    expect(res.body.shippingCents).toBe(10000);
    expect(res.body.totalCents).toBe(res.body.subtotalCents - res.body.discountCents + 10000);
  });
  it("applies a promo code when no offer applies, and reports bad codes", async () => {
    const ok = await api().post("/api/checkout/quote").send({ items: [item("rise-black-hoodie", "L")], governorate: "Giza", promoCode: "rise20" });
    expect(ok.body.discountCents).toBe(Math.round(119999 * 0.2));
    expect(ok.body.appliedPromo).toBe("RISE20");
    const bad = await api().post("/api/checkout/quote").send({ items: [item("rise-black-hoodie", "L")], promoCode: "NOPE" });
    expect(bad.body.promoMessage).toBe("Promo code doesn't exist.");
    expect(bad.body.discountCents).toBe(0);
  });
  it("ignores any price the client sends", async () => {
    const res = await api().post("/api/checkout/quote").send({
      items: [{ ...item("rise-black-hoodie", "L"), unitCents: 1, price: 1 }], governorate: "Cairo", total: 1,
    });
    expect(res.body.subtotalCents).toBe(119999);
  });
  it("rejects unknown governorates, sizes and bad quantities", async () => {
    expect((await api().post("/api/checkout/quote").send({ items: [item("rise-black-hoodie", "L")], governorate: "Atlantis" })).status).toBe(400);
    expect((await api().post("/api/checkout/quote").send({ items: [item("rise-black-hoodie", "XXL")] })).status).toBe(400);
    expect((await api().post("/api/checkout/quote").send({ items: [item("rise-black-hoodie", "L", 0)] })).status).toBe(400);
  });
});

describe("orders and accounts", () => {
  const order = (items: any[], extra: any = {}) => ({ items, governorate: "Cairo", customer, ...extra });
  const line = (slug: string, size: string, quantity = 1) => ({ productId: bySlug(slug).id, size, quantity });

  it("places a guest order, decrements stock and returns server totals", async () => {
    const before = await stockOf("rise-black-sweatpants", "L");
    const res = await api().post("/api/orders").send(order([line("rise-black-sweatpants", "L", 2)]));
    expect(res.status).toBe(201);
    expect(res.body.orderNumber).toMatch(/^RISE-\d+$/);
    expect(res.body.totalCents).toBe(139999 * 2 + 10000);
    expect(await stockOf("rise-black-sweatpants", "L")).toBe(before - 2);
  });

  it("refuses to oversell and leaves stock unchanged", async () => {
    const before = await stockOf("rise-black-hoodie", "M");
    const res = await api().post("/api/orders").send(order([line("rise-black-hoodie", "M", before + 1)]));
    expect(res.status).toBe(409);
    expect(await stockOf("rise-black-hoodie", "M")).toBe(before);
  });

  it("refuses sold-out sizes and is atomic across lines", async () => {
    const before = await stockOf("rise-black-sweatshirt", "M");
    const res = await api().post("/api/orders").send(order([line("rise-black-sweatshirt", "M"), line("rise-black-hoodie", "S")]));
    expect(res.status).toBe(409);
    expect(await stockOf("rise-black-sweatshirt", "M")).toBe(before);
  });

  it("validates customer details", async () => {
    const res = await api().post("/api/orders").send(order([line("rise-black-sweatshirt", "L")], { customer: { ...customer, email: "nope" } }));
    expect(res.status).toBe(400);
  });

  it("shows a logged-in customer only their own orders, filterable by status", async () => {
    const mine = await api().post("/api/orders").set(as("alice")).send(order([line("rise-black-sweatshirt", "L")]));
    await api().post("/api/orders").set(as("bob")).send(order([line("rise-black-sweatshirt", "L")]));
    const list = await api().get("/api/me/orders").set(as("alice"));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].orderNumber).toBe(mine.body.orderNumber);
    expect(list.body[0].items[0].name).toBe("Rise Black Sweatshirt");
    expect((await api().get("/api/me/orders?status=delivered").set(as("alice"))).body).toHaveLength(0);
    expect((await api().get("/api/me/orders?status=pending").set(as("alice"))).body).toHaveLength(1);
    expect((await api().get(`/api/me/orders/${mine.body.orderNumber}`).set(as("bob"))).status).toBe(404);
    expect((await api().get("/api/me/orders")).status).toBe(401);
  });

  it("attaches earlier guest orders to an account with the same verified email", async () => {
    const guest = await api().post("/api/orders").send(order([line("rise-black-sweatshirt", "L")], { customer: { ...customer, email: "later@example.com" } }));
    expect(guest.status).toBe(201);
    const mine = await api().get("/api/me/orders").set(as("later"));
    expect(mine.body.map((o: any) => o.orderNumber)).toContain(guest.body.orderNumber);
    expect((await api().get("/api/me/orders").set(as("someone-else"))).body).toHaveLength(0);
  });

  it("lets a customer cancel a pending order, restocking it", async () => {
    const before = await stockOf("rise-black-sweatshirt", "XL");
    const o = await api().post("/api/orders").set(as("carol")).send(order([line("rise-black-sweatshirt", "XL", 2)]));
    expect(await stockOf("rise-black-sweatshirt", "XL")).toBe(before - 2);
    const cancel = await api().post(`/api/me/orders/${o.body.orderNumber}/cancel`).set(as("carol"));
    expect(cancel.status).toBe(200);
    expect(await stockOf("rise-black-sweatshirt", "XL")).toBe(before);
    expect((await api().post(`/api/me/orders/${o.body.orderNumber}/cancel`).set(as("carol"))).status).toBe(409);
  });

  it("manages profile and addresses", async () => {
    const h = as("dave");
    await api().put("/api/me").set(h).send({ name: "Dave", mobile: "0100" }).expect(200);
    expect((await api().get("/api/me").set(h)).body.name).toBe("Dave");
    const a = await api().post("/api/me/addresses").set(h).send({ governorate: "Cairo", city: "Maadi", address: "1 Road 9", isDefault: true });
    expect(a.status).toBe(201);
    expect((await api().post("/api/me/addresses").set(h).send({ governorate: "Nowhere", city: "x", address: "abc" })).status).toBe(400);
    expect((await api().get("/api/me/addresses").set(as("erin"))).body).toHaveLength(0);
    await api().delete(`/api/me/addresses/${a.body.id}`).set(h).expect(204);
  });
});

describe("admin two-step login", () => {
  let secret = "";
  let session = "";
  let backup: string[] = [];

  it("blocks non-admins and admins who haven't completed 2-step", async () => {
    expect((await api().get("/api/admin/stats")).status).toBe(401);
    expect((await api().get("/api/admin/stats").set(as("alice"))).status).toBe(403);
    expect((await api().get("/api/admin/stats").set(adminAuth)).status).toBe(401);
    expect((await api().get("/api/admin/auth/status").set(as("alice"))).status).toBe(403);
  });

  it("does not grant admin to an email that isn't on the allow-list", async () => {
    expect((await api().get("/api/admin/auth/status").set(as("mallory", "mallory@example.com"))).status).toBe(403);
  });

  it("enrols an authenticator app and rejects a wrong first code", async () => {
    expect((await api().get("/api/admin/auth/status").set(adminAuth)).body.enrolled).toBe(false);
    const setup = await api().post("/api/admin/auth/setup").set(adminAuth);
    expect(setup.status).toBe(200);
    expect(setup.body.qr).toMatch(/^data:image\/png/);
    secret = setup.body.secret;
    expect((await api().post("/api/admin/auth/setup/confirm").set(adminAuth).send({ code: "000000" })).status).toBe(401);
    const ok = await api().post("/api/admin/auth/setup/confirm").set(adminAuth).send({ code: codeAt(secret, 0) });
    expect(ok.status).toBe(200);
    expect(ok.body.backupCodes).toHaveLength(8);
    backup = ok.body.backupCodes;
    session = ok.body.session;
    expect((await api().post("/api/admin/auth/setup").set(adminAuth)).status).toBe(409);
  });

  it("opens the admin API only with the session token", async () => {
    const res = await api().get("/api/admin/stats").set({ ...adminAuth, "X-Admin-Session": session });
    expect(res.status).toBe(200);
    expect(res.body.products).toBe(4);
    expect((await api().get("/api/admin/stats").set({ ...adminAuth, "X-Admin-Session": "garbage" })).status).toBe(401);
    const other = as("admin2", "admin@rise.test");
    expect((await api().get("/api/admin/stats").set({ ...other, "X-Admin-Session": session })).status).toBe(401);
  });

  it("verifies a TOTP code, and a backup code only once", async () => {
    const fresh = codeAt(secret, 1);
    const v = await api().post("/api/admin/auth/verify").set(adminAuth).send({ code: fresh });
    expect(v.status).toBe(200);
    expect(v.body.session).toBeTruthy();
    expect((await api().post("/api/admin/auth/verify").set(adminAuth).send({ code: fresh })).status).toBe(401);
    const code = backup[0]!;
    expect((await api().post("/api/admin/auth/verify").set(adminAuth).send({ code })).status).toBe(200);
    expect((await api().post("/api/admin/auth/verify").set(adminAuth).send({ code })).status).toBe(401);
  });

  it("locks after 5 wrong codes", async () => {
    // failures accumulate until a success
    await pool.query("UPDATE users SET totp_failed_attempts = 0 WHERE email = 'admin@rise.test'");
    for (let i = 0; i < 5; i++) {
      expect((await api().post("/api/admin/auth/verify").set(adminAuth).send({ code: "111111" })).status).toBe(401);
    }
    const locked = await api().post("/api/admin/auth/verify").set(adminAuth).send({ code: authenticator.generate(secret) });
    expect(locked.status).toBe(429);
    await pool.query("UPDATE users SET totp_locked_until = NULL WHERE email = 'admin@rise.test'");
  });

  describe("dashboard actions", () => {
    let h: Record<string, string>;
    beforeAll(async () => {
      const v = await api().post("/api/admin/auth/verify").set(adminAuth).send({ code: backup[1]! });
      h = { ...adminAuth, "X-Admin-Session": v.body.session };
    });

    it("creates a category, then a product that shows up in the public shop", async () => {
      const cat = await api().post("/api/admin/categories").set(h).send({ name: "Accessories" });
      expect(cat.body.slug).toBe("accessories");
      const p = await api().post("/api/admin/products").set(h).send({
        name: "Rise Cap", sku: "RISE-CAP-001", priceCents: 39900, categoryId: cat.body.id, featured: true,
        images: [{ url: "/images/cap.jpg" }], sizes: [{ size: "ONE", stock: 5 }],
      });
      expect(p.status).toBe(201);
      expect(p.body.slug).toBe("rise-cap");
      const dup = await api().post("/api/admin/products").set(h).send({ name: "Rise Cap", sku: "RISE-CAP-002", priceCents: 1, sizes: [] });
      expect(dup.body.slug).toBe("rise-cap-2");
      expect((await api().get("/api/products?category=accessories")).body).toHaveLength(1);
      await api().put(`/api/admin/products/${p.body.id}`).set(h).send({ ...p.body, priceCents: 39900, images: p.body.images, sizes: p.body.sizes, active: false }).expect(200);
      expect((await api().get("/api/products/rise-cap")).status).toBe(404);
      expect((await api().get(`/api/admin/products/${p.body.id}`).set(h)).body.active).toBe(false);
    });

    it("updates the announcement bar", async () => {
      const a = await api().post("/api/admin/announcements").set(h).send({ text: "FREE SHIPPING OVER 2000 EGP", active: true, sortOrder: 5 });
      expect((await api().get("/api/announcements")).body.map((x: any) => x.text)).toContain("FREE SHIPPING OVER 2000 EGP");
      await api().put(`/api/admin/announcements/${a.body.id}`).set(h).send({ text: a.body.text, active: false }).expect(200);
      expect((await api().get("/api/announcements")).body.map((x: any) => x.text)).not.toContain("FREE SHIPPING OVER 2000 EGP");
    });

    it("edits deals and promo codes, which immediately change pricing", async () => {
      const promo = await api().post("/api/admin/promo-codes").set(h).send({ code: "half", type: "percent", value: 50 });
      expect(promo.body.code).toBe("HALF");
      expect((await api().post("/api/admin/promo-codes").set(h).send({ code: "bad", type: "percent", value: 150 })).status).toBe(400);
      const q = await api().post("/api/checkout/quote").send({ items: [{ productId: bySlug("rise-black-hoodie").id, size: "L", quantity: 1 }], promoCode: "HALF" });
      expect(q.body.discountCents).toBe(Math.round(119999 / 2));

      const deals = (await api().get("/api/admin/deals").set(h)).body;
      await api().put(`/api/admin/deals/${deals[0].id}`).set(h).send({ ...deals[0], active: false }).expect(200);
      const three = await api().post("/api/checkout/quote").send({ items: [{ productId: bySlug("rise-black-hoodie").id, size: "L", quantity: 3 }] });
      expect(three.body.discountCents).toBe(0);
      await api().put(`/api/admin/deals/${deals[0].id}`).set(h).send({ ...deals[0], active: true }).expect(200);
    });

    it("moves orders through valid statuses only, restocking cancellations", async () => {
      const before = await stockOf("rise-black-sweatpants", "XL");
      const o = await api().post("/api/orders").send({
        items: [{ productId: bySlug("rise-black-sweatpants").id, size: "XL", quantity: 1 }], governorate: "Cairo", customer,
      });
      const row = (await api().get("/api/admin/orders?q=" + o.body.orderNumber).set(h)).body[0];
      expect(row.status).toBe("pending");
      expect((await api().patch(`/api/admin/orders/${row.id}/status`).set(h).send({ status: "delivered" })).status).toBe(409);
      await api().patch(`/api/admin/orders/${row.id}/status`).set(h).send({ status: "confirmed" }).expect(200);
      await api().patch(`/api/admin/orders/${row.id}/status`).set(h).send({ status: "canceled", note: "customer called" }).expect(200);
      expect(await stockOf("rise-black-sweatpants", "XL")).toBe(before);
      expect((await api().patch(`/api/admin/orders/${row.id}/status`).set(h).send({ status: "confirmed" })).status).toBe(409);
      const detail = (await api().get(`/api/admin/orders/${row.id}`).set(h)).body;
      expect(detail.history.map((x: any) => x.status)).toEqual(["pending", "confirmed", "canceled"]);
    });

    it("reports dashboard stats that add up", async () => {
      const stats = (await api().get("/api/admin/stats?days=7").set(h)).body;
      expect(stats.period.days).toBe(7);
      expect(stats.daily).toHaveLength(7);
      expect(stats.daily.reduce((n: number, d: any) => n + d.orders, 0)).toBe(stats.period.orders);
      expect(stats.daily.reduce((n: number, d: any) => n + d.revenueCents, 0)).toBe(stats.period.revenueCents);
      expect(Object.values(stats.statusCounts).reduce((n: number, v: any) => n + v, 0)).toBe(stats.orders);
      expect(stats.lowStock.some((s: any) => s.slug === "rise-grey-sweatpants" && s.stock === 0)).toBe(true);
      expect(stats.recentOrders.length).toBeGreaterThan(0);
      expect((await api().get("/api/admin/stats?days=999").set(h)).body.period.days).toBe(14);
    });

    it("accepts real images and rejects disguised files on upload", async () => {
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
      const ok = await api().post("/api/admin/uploads").set(h).set("Content-Type", "image/png").send(png);
      expect(ok.status).toBe(201);
      expect(ok.body.url).toMatch(/\/uploads\/[0-9a-f]{24}\.png$/);
      const fake = await api().post("/api/admin/uploads").set(h).set("Content-Type", "image/png").send(Buffer.from("<script>alert(1)</script>"));
      expect(fake.status).toBe(400);
    });
  });
});

describe("newsletter and contact", () => {
  it("stores subscribers once and contact messages", async () => {
    await api().post("/api/newsletter").send({ email: "Fan@Example.com" }).expect(201);
    await api().post("/api/newsletter").send({ email: "fan@example.com" }).expect(201);
    expect((await pool.query("SELECT count(*)::int AS n FROM newsletter_subscribers WHERE email = $1", ["fan@example.com"])).rows[0].n).toBe(1);
    await api().post("/api/contact").send({ name: "A", email: "a@b.co", message: "hello" }).expect(201);
    expect((await api().post("/api/contact").send({ name: "A", email: "bad", message: "x" })).status).toBe(400);
  });
});
