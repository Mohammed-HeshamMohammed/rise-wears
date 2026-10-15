import type { Announcement, Product } from "./types";

// Used only when the API can't be reached (for example a frontend-only test deployment), so the site still shows
// the current products and photos. It mirrors backend/src/seed.ts. Once the backend is live this is never used.

const CATEGORIES = { tops: { id: 1, name: "Tops", slug: "tops" }, pants: { id: 2, name: "Pants", slug: "pants" } };
const COLLECTIONS = { d1: { id: 1, name: "Drop 001", slug: "drop-001" }, d2: { id: 2, name: "Drop 002", slug: "drop-002" } };

const POSES: [string, string][] = [
  ["walking", "Walking pose"], ["seated", "Seated pose"], ["side", "Side view"],
  ["back", "Back view"], ["detail", "Fabric and logo detail"], ["flatlay", "Flat lay"],
];

interface Seed {
  id: number; legacy: string; slug: string; sku: string; name: string; subtitle: string; color: string; price: number;
  category: keyof typeof CATEGORIES; collection: keyof typeof COLLECTIONS; description: string; weight: string;
  photos: number; outfit: boolean; stock: Record<string, number>;
}

const SEEDS: Seed[] = [
  { id: 1, legacy: "blackhoodie", slug: "rise-black-hoodie", sku: "RISE-HOOD-001", name: "Rise Black Hoodie", subtitle: "Heavyweight Essential Hoodie", color: "Black", price: 119999, category: "tops", collection: "d2", description: "A premium heavyweight hoodie designed for everyday comfort, training and effortless streetwear styling.", weight: "420 GSM", photos: 1, outfit: true, stock: { S: 0, M: 2, L: 3, XL: 4 } },
  { id: 2, legacy: "blackpants", slug: "rise-black-sweatpants", sku: "RISE-SP-001", name: "Rise Black Sweatpants", subtitle: "Premium Everyday Sweatpants", color: "Black", price: 139999, category: "pants", collection: "d1", description: "Premium everyday sweatpants designed with comfort, movement and a clean streetwear aesthetic in mind.", weight: "400 GSM", photos: 3, outfit: false, stock: { S: 0, M: 10, L: 10, XL: 2 } },
  { id: 3, legacy: "greypants", slug: "rise-grey-sweatpants", sku: "RISE-SP-002", name: "Rise Grey Sweatpants", subtitle: "Premium Everyday Sweatpants", color: "Grey", price: 129999, category: "pants", collection: "d1", description: "Premium everyday sweatpants designed for comfort, movement and a clean understated look.", weight: "400 GSM", photos: 2, outfit: false, stock: { S: 0, M: 0, L: 0, XL: 0 } },
  { id: 4, legacy: "blacksweatshirt", slug: "rise-black-sweatshirt", sku: "RISE-SW-001", name: "Rise Black Sweatshirt", subtitle: "Heavyweight Essential Sweatshirt", color: "Black", price: 119999, category: "tops", collection: "d2", description: "A premium heavyweight sweatshirt designed for everyday comfort, training and effortless streetwear styling.", weight: "420 GSM", photos: 1, outfit: true, stock: { S: 4, M: 4, L: 4, XL: 4 } },
];

function build(s: Seed): Product {
  const base = `/images/products/${s.legacy}`;
  const images = [
    { url: `${base}/model.webp`, alt: `${s.name} worn by a model` },
    ...Array.from({ length: s.photos }, (_, i) => ({ url: `${base}/${i + 1}.jpg`, alt: `${s.name} image ${i + 1}` })),
    ...POSES.map(([file, label]) => ({ url: `${base}/${file}.webp`, alt: `${s.name} - ${label}` })),
    ...(s.outfit ? [{ url: `${base}/outfit.webp`, alt: `${s.name} - Styled outfit flat lay` }] : []),
  ];
  const sizes = Object.entries(s.stock).map(([size, stock]) => ({ size, stock }));
  return {
    id: s.id, slug: s.slug, legacyId: s.legacy, sku: s.sku, name: s.name, subtitle: s.subtitle, color: s.color,
    description: s.description, material: "100% Cotton", weight: s.weight, fit: "Oversized",
    care: "Machine wash cold. Hang dry recommended.", priceCents: s.price, comparePriceCents: null,
    featured: true, comingSoon: false, active: true, soldOut: sizes.every((x) => x.stock <= 0),
    updatedAt: "2026-10-13T00:00:00.000Z", category: CATEGORIES[s.category], collection: COLLECTIONS[s.collection], images, sizes,
  };
}

export const FALLBACK_PRODUCTS: Product[] = SEEDS.map(build);
export const FALLBACK_CATEGORIES = Object.values(CATEGORIES).map(({ name, slug }) => ({ name, slug }));
export const FALLBACK_ANNOUNCEMENTS: Announcement[] = [{ id: 1, text: "BUY 2 GET 50% OFF THE 3RD!", link: "" }];
