export interface Product {
  id: number;
  slug: string;
  legacyId: string | null;
  sku: string;
  name: string;
  subtitle: string;
  color: string;
  description: string;
  material: string;
  weight: string;
  fit: string;
  care: string;
  priceCents: number;
  comparePriceCents: number | null;
  featured: boolean;
  comingSoon: boolean;
  active: boolean;
  soldOut: boolean;
  updatedAt: string;
  category: { id: number; name: string; slug: string } | null;
  collection: { id: number; name: string; slug: string } | null;
  images: { url: string; alt: string }[];
  sizes: { size: string; stock: number }[];
}

export interface Announcement {
  id: number;
  text: string;
  link: string;
}

export interface QuoteLine {
  productId: number;
  slug: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  unitCents: number;
  stock: number;
  imageUrl: string;
}

export interface Quote {
  lines: QuoteLine[];
  subtotalCents: number;
  discountCents: number;
  offerDiscountCents: number;
  promoDiscountCents: number;
  appliedPromo: string | null;
  promoMessage: string | null;
  shippingCents: number;
  totalCents: number;
  deal: { name: string; buyQty: number; discountPercent: number } | null;
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "canceled" | "returned";

export interface OrderItem {
  productId: number | null;
  slug: string | null;
  name: string;
  color: string;
  size: string;
  quantity: number;
  unitPriceCents: number;
  imageUrl: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  customerName: string;
  email: string;
  mobile: string;
  governorate: string;
  city: string;
  address: string;
  apartment: string;
  notes: string;
  promoCode: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  paymentMethod: string;
  items: OrderItem[];
  history?: { status: OrderStatus; note: string; createdAt: string }[];
}

export interface CartItem {
  productId: number;
  size: string;
  quantity: number;
}
