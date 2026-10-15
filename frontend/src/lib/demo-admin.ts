import { ApiError } from "./api";
import { FALLBACK_PRODUCTS } from "./fallback-catalog";
import type { Product } from "./types";

// In-browser stand-in for the admin API, used only when no backend can be reached (a frontend-only test site).
// It never talks to a server, grants no real access, and keeps its data in this browser's localStorage.

export const DEMO_USER = "admin";
export const DEMO_PASSWORD = "admin123";

const KEY = "rise-demo-admin-data";
const FLOW: Record<string, string[]> = {
  pending: ["confirmed", "canceled"], confirmed: ["shipped", "canceled"], shipped: ["delivered", "returned"],
  delivered: ["returned"], canceled: [], returned: [],
};

interface Tax { id: number; name: string; slug: string; sortOrder: number }
interface Order {
  id: number; order_number: string; status: string; created_at: string; customer_name: string; email: string; mobile: string;
  governorate: string; city: string; address: string; apartment: string; notes: string; promo_code: string | null;
  subtotal_cents: number; discount_cents: number; shipping_cents: number; total_cents: number;
  items: { id: number; product_name: string; color: string; size: string; quantity: number; unit_price_cents: number; image_url: string }[];
  history: { id: number; status: string; note: string; created_at: string }[];
}
interface State {
  products: Product[]; categories: Tax[]; collections: Tax[]; announcements: any[]; deals: any[]; promos: any[];
  rates: { governorate: string; costCents: number }[]; orders: Order[]; customers: any[]; subscribers: any[]; messages: any[];
}

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item";
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const RATES: [number, string[]][] = [
  [10000, ["Cairo", "Giza"]],
  [12000, ["Alexandria", "Port Said", "Qalyubia", "Dakahlia", "Sharkia", "Ismailia", "Suez", "Gharbia", "Menoufia", "El-Beheira", "Kafr el-Sheikh", "Damietta"]],
  [15000, ["Bani Suef", "Fayoum", "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan", "The Red Sea", "The New Valley", "Matrouh", "North Sinai", "South Sinai"]],
];

function seed(): State {
  const products = structuredClone(FALLBACK_PRODUCTS);
  const people = [
    { name: "Mona Ali", email: "customer@rise.test", mobile: "01012345678" },
    { name: "Sara Hassan", email: "sara@rise.test", mobile: "01123456789" },
    { name: "Omar Khaled", email: "omar@rise.test", mobile: "01234567890" },
  ];
  const plan: [number, string, string, string, [string, string, number][]][] = [
    [0, "pending", "Cairo", "Maadi", [["rise-black-hoodie", "L", 1]]],
    [0, "delivered", "Cairo", "Maadi", [["rise-black-sweatpants", "M", 1], ["rise-black-sweatshirt", "L", 1]]],
    [1, "shipped", "Alexandria", "Smouha", [["rise-black-hoodie", "M", 2]]],
    [1, "confirmed", "Alexandria", "Smouha", [["rise-black-sweatpants", "L", 1]]],
    [2, "canceled", "Giza", "Dokki", [["rise-black-sweatshirt", "XL", 1]]],
    [2, "returned", "Giza", "Dokki", [["rise-black-hoodie", "XL", 1]]],
  ];
  const flow: Record<string, string[]> = {
    pending: ["pending"], confirmed: ["pending", "confirmed"], shipped: ["pending", "confirmed", "shipped"],
    delivered: ["pending", "confirmed", "shipped", "delivered"], canceled: ["pending", "canceled"], returned: ["pending", "confirmed", "shipped", "delivered", "returned"],
  };
  const rateFor = (g: string) => RATES.find(([, list]) => list.includes(g))![0];
  const orders: Order[] = plan.map(([who, status, governorate, city, lines], i) => {
    const items = lines.map(([slug, size, quantity], j) => {
      const p = products.find((x) => x.slug === slug)!;
      return { id: i * 10 + j + 1, product_name: p.name, color: p.color, size, quantity, unit_price_cents: p.priceCents, image_url: p.images[0]?.url ?? "" };
    });
    const subtotal = items.reduce((s, x) => s + x.unit_price_cents * x.quantity, 0);
    const shipping = rateFor(governorate);
    return {
      id: i + 1, order_number: `RISE-${1001 + i}`, status, created_at: daysAgo(6 - i), customer_name: people[who]!.name, email: people[who]!.email,
      mobile: people[who]!.mobile, governorate, city, address: "12 Test Street", apartment: "", notes: "", promo_code: null,
      subtotal_cents: subtotal, discount_cents: 0, shipping_cents: shipping, total_cents: subtotal + shipping, items,
      history: flow[status]!.map((s, k) => ({ id: k + 1, status: s, note: "Demo order", created_at: daysAgo(6 - i - k * 0.1) })),
    };
  });
  return {
    products,
    categories: [{ id: 1, name: "Tops", slug: "tops", sortOrder: 0 }, { id: 2, name: "Pants", slug: "pants", sortOrder: 1 }],
    collections: [{ id: 1, name: "Drop 001", slug: "drop-001", sortOrder: 0 }, { id: 2, name: "Drop 002", slug: "drop-002", sortOrder: 1 }],
    announcements: [{ id: 1, text: "BUY 2 GET 50% OFF THE 3RD!", link: "", active: true, sortOrder: 0 }],
    deals: [{ id: 1, name: "Buy 2 get 50% off the 3rd", buyQty: 2, discountPercent: 50, active: true, startsAt: null, endsAt: null, productIds: [] }],
    promos: [
      { id: 1, code: "WELCOME10", type: "percent", value: 10, description: "10% off your first order.", active: true, expiresAt: "2027-01-01T00:00:00.000Z" },
      { id: 2, code: "DROP001", type: "percent", value: 15, description: "Launch Collection Discount.", active: true, expiresAt: "2027-01-01T00:00:00.000Z" },
      { id: 3, code: "RISE20", type: "percent", value: 20, description: "VIP Members Only.", active: true, expiresAt: "2027-01-01T00:00:00.000Z" },
      { id: 4, code: "SAVE100", type: "fixed", value: 10000, description: "Save EGP 100", active: true, expiresAt: "2027-01-01T00:00:00.000Z" },
    ],
    rates: RATES.flatMap(([costCents, list]) => list.map((governorate) => ({ governorate, costCents }))),
    orders,
    customers: people.map((p, i) => ({ id: i + 1, email: p.email, name: p.name, mobile: p.mobile, createdAt: daysAgo(20 - i), orderCount: 2 })),
    subscribers: ["fan@example.com", "gymrat@example.com", "style@example.com"].map((email, i) => ({ id: i + 1, email, createdAt: daysAgo(10 - i) })),
    messages: [
      { id: 1, name: "Sara", email: "sara@example.com", subject: "Sizing", message: "Is the hoodie true to size?", createdAt: daysAgo(2) },
      { id: 2, name: "Karim", email: "karim@example.com", subject: "Collaboration", message: "Would you like to work together on a photoshoot?", createdAt: daysAgo(1) },
    ],
  };
}

let memory: State | null = null;
function load(): State {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (memory = JSON.parse(raw) as State);
  } catch {}
  return (memory = seed());
}
function save(s: State) {
  memory = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
export function resetDemoData() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

const nextId = (rows: { id: number }[]) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
const fail = (status: number, message: string): never => {
  throw new ApiError(status, message);
};

function buildProduct(s: State, id: number, b: any, previous?: Product): Product {
  const base = slugify(b.slug || b.name || "product");
  let slug = base;
  for (let n = 2; s.products.some((p) => p.slug === slug && p.id !== id); n++) slug = `${base}-${n}`;
  const sizes = (b.sizes ?? []).map((x: any) => ({ size: String(x.size), stock: Number(x.stock) || 0 }));
  return {
    id, slug, legacyId: previous?.legacyId ?? null, sku: b.sku, name: b.name, subtitle: b.subtitle ?? "", color: b.color ?? "",
    description: b.description ?? "", material: b.material ?? "", weight: b.weight ?? "", fit: b.fit ?? "", care: b.care ?? "",
    priceCents: Number(b.priceCents) || 0, comparePriceCents: b.comparePriceCents ?? null,
    featured: !!b.featured, comingSoon: !!b.comingSoon, active: b.active !== false, soldOut: sizes.length > 0 && sizes.every((x: any) => x.stock <= 0),
    updatedAt: new Date().toISOString(),
    category: s.categories.find((c) => c.id === b.categoryId) ? { id: b.categoryId, name: s.categories.find((c) => c.id === b.categoryId)!.name, slug: s.categories.find((c) => c.id === b.categoryId)!.slug } : null,
    collection: s.collections.find((c) => c.id === b.collectionId) ? { id: b.collectionId, name: s.collections.find((c) => c.id === b.collectionId)!.name, slug: s.collections.find((c) => c.id === b.collectionId)!.slug } : null,
    images: (b.images ?? []).map((i: any) => ({ url: i.url, alt: i.alt || b.name })), sizes,
  };
}

function simpleCrud<T extends { id: number }>(rows: T[], method: string, id: number | null, body: any, make: (b: any, existing?: T) => T): T | undefined {
  if (method === "POST") {
    const row = make(body);
    row.id = nextId(rows);
    rows.push(row);
    return row;
  }
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) fail(404, "Not found");
  if (method === "DELETE") {
    rows.splice(i, 1);
    return undefined;
  }
  rows[i] = { ...make(body, rows[i]), id: id! };
  return rows[i];
}

export async function demoRequest(method: string, path: string, body: unknown, raw?: { data: Blob }): Promise<any> {
  const [pathname = "", qs = ""] = path.split("?");
  const q = new URLSearchParams(qs);
  const [area = "", rawId, sub] = pathname.replace(/^\/admin\//, "").split("/");
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;
  const b = (body ?? {}) as any;
  const s = load();
  const done = <T,>(value: T): T => (method === "GET" ? value : (save(s), value));

  if (raw) {
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new ApiError(400, "Couldn't read that image."));
      r.readAsDataURL(raw.data);
    });
    return { url };
  }

  switch (area) {
    case "stats": {
      const live = s.orders.filter((o) => !["canceled", "returned"].includes(o.status));
      return { orders: s.orders.length, pending: s.orders.filter((o) => o.status === "pending").length, revenueCents: live.reduce((n, o) => n + o.total_cents, 0),
        products: s.products.length, active: s.products.filter((p) => p.active).length, customers: s.customers.length, subscribers: s.subscribers.length };
    }
    case "products": {
      if (method === "GET") return id ? s.products.find((p) => p.id === id) ?? fail(404, "Product not found") : s.products;
      if (method === "DELETE") { s.products = s.products.filter((p) => p.id !== id); return done(undefined); }
      if (!b.name || !b.sku) fail(400, "Name and SKU are required.");
      if (method === "POST") { const p = buildProduct(s, nextId(s.products), b); s.products.push(p); return done(p); }
      const i = s.products.findIndex((p) => p.id === id);
      if (i < 0) fail(404, "Product not found");
      s.products[i] = buildProduct(s, id!, b, s.products[i]);
      return done(s.products[i]);
    }
    case "categories":
    case "collections": {
      const rows = area === "categories" ? s.categories : s.collections;
      if (method === "GET") return rows;
      const row = simpleCrud(rows, method, id, b, (x, e) => ({ id: e?.id ?? 0, name: x.name, slug: slugify(x.slug || x.name), sortOrder: x.sortOrder ?? e?.sortOrder ?? 0 }));
      if (method === "DELETE" && id) s.products.forEach((p) => { if (p.category?.id === id && area === "categories") p.category = null; if (p.collection?.id === id && area === "collections") p.collection = null; });
      return done(row);
    }
    case "announcements": {
      if (method === "GET") return s.announcements;
      return done(simpleCrud(s.announcements, method, id, b, (x, e) => ({ id: e?.id ?? 0, text: x.text, link: x.link ?? "", active: x.active ?? true, sortOrder: x.sortOrder ?? e?.sortOrder ?? 0 })));
    }
    case "promo-codes": {
      if (method === "GET") return s.promos;
      if (b.type === "percent" && b.value > 100) fail(400, "Percent can't be more than 100.");
      return done(simpleCrud(s.promos, method, id, b, (x, e) => ({ id: e?.id ?? 0, code: String(x.code).toUpperCase(), type: x.type, value: x.value, description: x.description ?? "", active: x.active ?? true, expiresAt: x.expiresAt ?? null })));
    }
    case "deals": {
      if (method === "GET") return s.deals;
      return done(simpleCrud(s.deals, method, id, b, (x, e) => ({ id: e?.id ?? 0, name: x.name, buyQty: x.buyQty, discountPercent: x.discountPercent, active: x.active ?? true, startsAt: x.startsAt ?? null, endsAt: x.endsAt ?? null, productIds: x.productIds ?? [] })));
    }
    case "shipping-rates": {
      if (method === "GET") return s.rates;
      for (const r of b as { governorate: string; costCents: number }[]) {
        const row = s.rates.find((x) => x.governorate === r.governorate);
        if (row) row.costCents = r.costCents;
      }
      return done({ ok: true });
    }
    case "orders": {
      if (method === "GET" && id === null) {
        const status = q.get("status"), needle = (q.get("q") ?? "").toLowerCase();
        return s.orders
          .filter((o) => (!status || o.status === status) && (!needle || [o.order_number, o.customer_name, o.email, o.mobile].some((v) => v.toLowerCase().includes(needle))))
          .sort((a, c) => c.created_at.localeCompare(a.created_at))
          .map((o) => ({ id: o.id, orderNumber: o.order_number, status: o.status, createdAt: o.created_at, customerName: o.customer_name, email: o.email, mobile: o.mobile,
            governorate: o.governorate, totalCents: o.total_cents, itemCount: o.items.reduce((n, i) => n + i.quantity, 0) }));
      }
      const order = s.orders.find((o) => o.id === id) ?? fail(404, "Order not found");
      if (method === "GET") return { ...order, orderNumber: order.order_number };
      if (sub === "status") {
        if (!FLOW[order.status]?.includes(b.status)) fail(409, `Can't move an order from ${order.status} to ${b.status}.`);
        order.status = b.status;
        order.history.push({ id: order.history.length + 1, status: b.status, note: b.note ?? "", created_at: new Date().toISOString() });
        return done({ ok: true, status: b.status });
      }
      return fail(404, "Not found");
    }
    case "customers": return s.customers;
    case "subscribers": return s.subscribers;
    case "messages": return s.messages;
  }
  return fail(404, "Not available in demo mode.");
}
