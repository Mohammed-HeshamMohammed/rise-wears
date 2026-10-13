import { describe, expect, it } from "vitest";
import { computeTotals, offerDiscount } from "../src/lib/pricing.js";

const deal = { buyQty: 2, discountPercent: 50, productIds: [] as number[] };
const line = (productId: number, unitCents: number, quantity: number) => ({ productId, unitCents, quantity });

describe("buy 2 get 50% off the 3rd", () => {
  it("gives nothing for 2 items", () => {
    expect(offerDiscount([line(1, 100_00, 2)], deal)).toBe(0);
  });
  it("halves the cheapest of 3 items", () => {
    // 1199.99 + 1399.99 + 1299.99 -> cheapest 1199.99 -> 599.995 -> rounds to 60000 piastres
    const d = offerDiscount([line(1, 119999, 1), line(2, 139999, 1), line(3, 129999, 1)], deal);
    expect(d).toBe(Math.round(119999 / 2));
  });
  it("gives one discount per complete group of 3", () => {
    expect(offerDiscount([line(1, 100_00, 6)], deal)).toBe(2 * 50_00);
    expect(offerDiscount([line(1, 100_00, 5)], deal)).toBe(50_00);
  });
  it("only counts products the deal covers", () => {
    const d = { ...deal, productIds: [1] };
    expect(offerDiscount([line(1, 100_00, 2), line(2, 10_00, 1)], d)).toBe(0);
    expect(offerDiscount([line(1, 100_00, 3), line(2, 10_00, 1)], d)).toBe(50_00);
  });
});

describe("computeTotals", () => {
  const lines = [line(1, 100_00, 3)];
  it("uses the offer and ignores the promo when the offer applies", () => {
    const t = computeTotals({ lines, deal, promo: { code: "RISE20", type: "percent", value: 20 }, shippingCents: 100_00 });
    expect(t.discountCents).toBe(50_00);
    expect(t.appliedPromo).toBeNull();
    expect(t.totalCents).toBe(300_00 - 50_00 + 100_00);
  });
  it("uses the promo when no offer applies", () => {
    const t = computeTotals({ lines: [line(1, 100_00, 1)], deal, promo: { code: "RISE20", type: "percent", value: 20 }, shippingCents: 100_00 });
    expect(t.discountCents).toBe(20_00);
    expect(t.appliedPromo).toBe("RISE20");
    expect(t.totalCents).toBe(80_00 + 100_00);
  });
  it("never lets a discount push the total below shipping", () => {
    const t = computeTotals({ lines: [line(1, 50_00, 1)], deal: null, promo: { code: "BIG", type: "fixed", value: 999_00 }, shippingCents: 100_00 });
    expect(t.discountCents).toBe(50_00);
    expect(t.totalCents).toBe(100_00);
  });
  it("works with no deal and no promo", () => {
    const t = computeTotals({ lines, deal: null, promo: null, shippingCents: 0 });
    expect(t.totalCents).toBe(300_00);
  });
});
