/**
 * Server-side pricing. The browser never decides prices, discounts or shipping.
 * All amounts are integer piastres.
 *
 * Rules (copied from the live store):
 *  - Automatic offer: buy N, the cheapest item of every complete group of N+1 gets P% off.
 *  - Offer and promo codes never combine: if the offer applies, only the offer is used.
 *  - A discount can never take the total below the shipping cost.
 */

export interface PricedLine {
  productId: number;
  unitCents: number;
  quantity: number;
}

export interface DealRule {
  buyQty: number;
  discountPercent: number;
  /** empty = applies to all products */
  productIds: number[];
}

export interface PromoRule {
  code: string;
  type: "percent" | "fixed";
  /** percent, or piastres when type is fixed */
  value: number;
}

export interface Totals {
  subtotalCents: number;
  offerDiscountCents: number;
  promoDiscountCents: number;
  discountCents: number;
  appliedPromo: string | null;
  shippingCents: number;
  totalCents: number;
}

export function offerDiscount(lines: PricedLine[], deal: DealRule | null): number {
  if (!deal) return 0;
  const eligible: number[] = [];
  for (const l of lines) {
    if (deal.productIds.length && !deal.productIds.includes(l.productId)) continue;
    for (let i = 0; i < l.quantity; i++) eligible.push(l.unitCents);
  }
  eligible.sort((a, b) => a - b);
  const group = deal.buyQty + 1;
  let discount = 0;
  for (let i = 0; i + deal.buyQty < eligible.length; i += group) {
    discount += Math.round((eligible[i]! * deal.discountPercent) / 100);
  }
  return discount;
}

export function promoDiscount(subtotalCents: number, promo: PromoRule | null): number {
  if (!promo) return 0;
  const raw = promo.type === "percent" ? Math.round((subtotalCents * promo.value) / 100) : promo.value;
  return Math.min(raw, subtotalCents);
}

export function computeTotals(input: {
  lines: PricedLine[];
  deal: DealRule | null;
  promo: PromoRule | null;
  shippingCents: number;
}): Totals {
  const subtotalCents = input.lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  const offer = Math.min(offerDiscount(input.lines, input.deal), subtotalCents);
  const promo = promoDiscount(subtotalCents, input.promo);
  const useOffer = offer > 0;
  const discountCents = useOffer ? offer : promo;
  return {
    subtotalCents,
    offerDiscountCents: offer,
    promoDiscountCents: useOffer ? 0 : promo,
    discountCents,
    appliedPromo: !useOffer && promo > 0 && input.promo ? input.promo.code : null,
    shippingCents: input.shippingCents,
    totalCents: subtotalCents - discountCents + input.shippingCents,
  };
}
