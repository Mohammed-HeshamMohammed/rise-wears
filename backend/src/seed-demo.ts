// Test accounts and demo orders for local testing only. Needs AUTH_DEV_MODE (no passwords are checked) and refuses to run in production.
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { pool, tx } from "./db.js";
import { migrate } from "./migrate.js";
import { seed } from "./seed.js";
import type { OrderStatus } from "./lib/orders.js";

const ACCOUNTS = [
  { email: "admin@rise.test", name: "Test Admin", role: "admin", mobile: "01000000001" },
  { email: "customer@rise.test", name: "Mona Ali", role: "customer", mobile: "01012345678" },
  { email: "sara@rise.test", name: "Sara Hassan", role: "customer", mobile: "01123456789" },
  { email: "omar@rise.test", name: "Omar Khaled", role: "customer", mobile: "01234567890" },
] as const;

const ORDERS: { email: string; status: OrderStatus; governorate: string; city: string; lines: [string, string, number][] }[] = [
  { email: "customer@rise.test", status: "pending", governorate: "Cairo", city: "Maadi", lines: [["rise-black-hoodie", "L", 1]] },
  { email: "customer@rise.test", status: "delivered", governorate: "Cairo", city: "Maadi", lines: [["rise-black-sweatpants", "M", 1], ["rise-black-sweatshirt", "L", 1]] },
  { email: "sara@rise.test", status: "shipped", governorate: "Alexandria", city: "Smouha", lines: [["rise-black-hoodie", "M", 2]] },
  { email: "sara@rise.test", status: "confirmed", governorate: "Alexandria", city: "Smouha", lines: [["rise-black-sweatpants", "L", 1]] },
  { email: "omar@rise.test", status: "canceled", governorate: "Giza", city: "Dokki", lines: [["rise-black-sweatshirt", "XL", 1]] },
  { email: "omar@rise.test", status: "returned", governorate: "Giza", city: "Dokki", lines: [["rise-black-hoodie", "XL", 1]] },
];

const FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["pending"],
  confirmed: ["pending", "confirmed"],
  shipped: ["pending", "confirmed", "shipped"],
  delivered: ["pending", "confirmed", "shipped", "delivered"],
  canceled: ["pending", "canceled"],
  returned: ["pending", "confirmed", "shipped", "delivered", "returned"],
};

export async function seedDemo() {
  if (config.NODE_ENV === "production") throw new Error("Demo data is for local testing only.");
  await migrate();
  await seed();
  await tx(async (db) => {
    const ids = new Map<string, number>();
    for (const a of ACCOUNTS) {
      const row = await db.query(
        `INSERT INTO users (firebase_uid, email, name, mobile, role) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (firebase_uid) DO UPDATE SET name = EXCLUDED.name, mobile = EXCLUDED.mobile, role = EXCLUDED.role RETURNING id`,
        [a.email, a.email, a.name, a.mobile, a.role],
      );
      ids.set(a.email, row.rows[0].id);
    }
    const existing = await db.query("SELECT 1 FROM orders WHERE user_id = $1 LIMIT 1", [ids.get("customer@rise.test")]);
    if (existing.rows.length) return console.log("demo accounts ready; demo orders already present");
    for (const o of ORDERS) {
      const account = ACCOUNTS.find((a) => a.email === o.email)!;
      const rate = (await db.query("SELECT cost_cents FROM shipping_rates WHERE governorate = $1", [o.governorate])).rows[0].cost_cents;
      const items = [];
      for (const [slug, size, quantity] of o.lines) {
        const p = (await db.query(
          `SELECT p.id, p.name, p.color, p.price_cents,
                  COALESCE((SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1), '') AS image
           FROM products p WHERE p.slug = $1`,
          [slug],
        )).rows[0];
        items.push({ ...p, size, quantity });
      }
      const subtotal = items.reduce((s, i) => s + i.price_cents * i.quantity, 0);
      const seq = (await db.query("SELECT nextval('order_number_seq') AS n")).rows[0].n;
      const order = await db.query(
        `INSERT INTO orders (order_number, user_id, status, customer_name, email, mobile, governorate, city, address,
                             subtotal_cents, discount_cents, shipping_cents, total_cents)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12) RETURNING id`,
        [`RISE-${seq}`, ids.get(o.email), o.status, account.name, account.email, account.mobile, o.governorate, o.city, "12 Test Street", subtotal, rate, subtotal + rate],
      );
      for (const i of items) {
        await db.query(
          "INSERT INTO order_items (order_id, product_id, product_name, color, size, quantity, unit_price_cents, image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [order.rows[0].id, i.id, i.name, i.color, i.size, i.quantity, i.price_cents, i.image],
        );
      }
      for (const status of FLOW[o.status]) {
        await db.query("INSERT INTO order_status_history (order_id, status, note) VALUES ($1,$2,'Demo order')", [order.rows[0].id, status]);
      }
    }
    console.log(`created ${ACCOUNTS.length} test accounts and ${ORDERS.length} demo orders`);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDemo()
    .then(() => pool.end())
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
