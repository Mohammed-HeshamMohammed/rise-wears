/**
 * Seeds the data that exists on the current rise-wear.store: 4 products, categories,
 * collections, shipping rates, the announcement, the buy-2 offer and the 4 promo codes.
 * Safe to re-run: existing rows are left untouched (stock is never overwritten).
 */
import { fileURLToPath } from "node:url";
import { migrate } from "./migrate.js";
import { pool, tx } from "./db.js";

const SHIPPING: Record<number, string[]> = {
  100: ["Cairo", "Giza"],
  120: ["Alexandria", "Port Said", "Qalyubia", "Dakahlia", "Sharkia", "Ismailia", "Suez", "Gharbia", "Menoufia", "El-Beheira", "Kafr el-Sheikh", "Damietta"],
  150: ["Bani Suef", "Fayoum", "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "The Red Sea", "The New Valley", "Matrouh", "North Sinai", "South Sinai"],
};

const COPY = {
  hoodie: "A premium heavyweight hoodie designed for everyday comfort, training and effortless streetwear styling.",
  sweatshirt: "A premium heavyweight sweatshirt designed for everyday comfort, training and effortless streetwear styling.",
};

const PRODUCTS = [
  { legacy: "blackhoodie", slug: "rise-black-hoodie", sku: "RISE-HOOD-001", name: "Rise Black Hoodie", subtitle: "Heavyweight Essential Hoodie", color: "Black", price: 119999, cat: "Tops", col: "Drop 002", desc: COPY.hoodie, weight: "420 GSM", images: 1, stock: { S: 0, M: 2, L: 3, XL: 4 } },
  { legacy: "blackpants", slug: "rise-black-sweatpants", sku: "RISE-SP-001", name: "Rise Black Sweatpants", subtitle: "Premium Everyday Sweatpants", color: "Black", price: 139999, cat: "Pants", col: "Drop 001", desc: "Premium everyday sweatpants designed with comfort, movement and a clean streetwear aesthetic in mind.", weight: "400 GSM", images: 3, stock: { S: 0, M: 10, L: 10, XL: 2 } },
  { legacy: "greypants", slug: "rise-grey-sweatpants", sku: "RISE-SP-002", name: "Rise Grey Sweatpants", subtitle: "Premium Everyday Sweatpants", color: "Grey", price: 129999, cat: "Pants", col: "Drop 001", desc: "Premium everyday sweatpants designed for comfort, movement and a clean understated look.", weight: "400 GSM", images: 2, stock: { S: 0, M: 0, L: 0, XL: 0 } },
  { legacy: "blacksweatshirt", slug: "rise-black-sweatshirt", sku: "RISE-SW-001", name: "Rise Black Sweatshirt", subtitle: "Heavyweight Essential Sweatshirt", color: "Black", price: 119999, cat: "Tops", col: "Drop 002", desc: COPY.sweatshirt, weight: "420 GSM", images: 1, stock: { S: 4, M: 4, L: 4, XL: 4 } },
] as const;

const PROMOS = [
  { code: "WELCOME10", type: "percent", value: 10, description: "10% off your first order." },
  { code: "DROP001", type: "percent", value: 15, description: "Launch Collection Discount." },
  { code: "RISE20", type: "percent", value: 20, description: "VIP Members Only." },
  { code: "SAVE100", type: "fixed", value: 10000, description: "Save EGP 100" },
] as const;

export async function seed() {
  await migrate();
  await tx(async (db) => {
    for (const [i, name] of ["Tops", "Pants"].entries()) {
      await db.query("INSERT INTO categories (name, slug, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [name, name.toLowerCase(), i]);
    }
    for (const [i, name] of ["Drop 001", "Drop 002"].entries()) {
      await db.query("INSERT INTO collections (name, slug, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [name, name.toLowerCase().replace(" ", "-"), i]);
    }
    for (const [cost, govs] of Object.entries(SHIPPING)) {
      for (const g of govs) {
        await db.query("INSERT INTO shipping_rates (governorate, cost_cents) VALUES ($1,$2) ON CONFLICT DO NOTHING", [g, Number(cost) * 100]);
      }
    }
    await db.query(
      `INSERT INTO announcements (text, active, sort_order)
       SELECT 'BUY 2 GET 50% OFF THE 3RD!', TRUE, 0 WHERE NOT EXISTS (SELECT 1 FROM announcements)`,
    );
    await db.query(
      `INSERT INTO deals (name, buy_qty, discount_percent, active)
       SELECT 'Buy 2 get 50% off the 3rd', 2, 50, TRUE WHERE NOT EXISTS (SELECT 1 FROM deals)`,
    );
    for (const p of PROMOS) {
      await db.query(
        "INSERT INTO promo_codes (code, type, value, description, expires_at) VALUES ($1,$2,$3,$4,'2027-01-01') ON CONFLICT DO NOTHING",
        [p.code, p.type, p.value, p.description],
      );
    }
    for (const p of PRODUCTS) {
      const cat = (await db.query("SELECT id FROM categories WHERE name = $1", [p.cat])).rows[0].id;
      const col = (await db.query("SELECT id FROM collections WHERE name = $1", [p.col])).rows[0].id;
      const ins = await db.query(
        `INSERT INTO products (slug, legacy_id, sku, name, subtitle, color, description, material, weight, fit, care,
           price_cents, category_id, collection_id, featured)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'100% Cotton',$8,'Oversized','Machine wash cold. Hang dry recommended.',$9,$10,$11,TRUE)
         ON CONFLICT (slug) DO NOTHING RETURNING id`,
        [p.slug, p.legacy, p.sku, p.name, p.subtitle, p.color, p.desc, p.weight, p.price, cat, col],
      );
      const id = ins.rows[0]?.id;
      if (!id) continue; // already seeded
      for (let n = 1; n <= p.images; n++) {
        await db.query("INSERT INTO product_images (product_id, url, alt, sort_order) VALUES ($1,$2,$3,$4)", [
          id, `/images/products/${p.legacy}/${n}.jpg`, `${p.name} image ${n}`, n,
        ]);
      }
      for (const [i, [size, stock]] of Object.entries(p.stock).entries()) {
        await db.query("INSERT INTO product_variants (product_id, size, stock, sort_order) VALUES ($1,$2,$3,$4)", [id, size, stock, i]);
      }
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seed()
    .then(() => {
      console.log("seeded");
      return pool.end();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
