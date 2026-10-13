"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { CartItem, Product } from "./types";

interface CartCtx {
  items: CartItem[];
  count: number;
  add(item: CartItem): void;
  setQuantity(productId: number, size: string, quantity: number): void;
  remove(productId: number, size: string): void;
  clear(): void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "rise-cart-v2";
const LEGACY_KEY = "rise-cart"; // the old static site stored [{ id: "blackhoodie", size, quantity }]

const read = (): CartItem[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v)
      ? v.filter((i) => Number.isInteger(i?.productId) && typeof i?.size === "string" && i?.quantity > 0)
      : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // Don't write to storage until the saved bag has been loaded, or the first render would wipe it.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(read());
    setHydrated(true);
    // One-time carry-over of a cart left in the browser by the old store.
    (async () => {
      try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (!raw) return;
        const old = JSON.parse(raw) as { id: string; size: string; quantity: number }[];
        localStorage.removeItem(LEGACY_KEY);
        if (!Array.isArray(old) || !old.length) return;
        const products = await api<Product[]>("/products");
        const migrated: CartItem[] = [];
        for (const o of old) {
          const p = products.find((x) => x.legacyId === o.id);
          if (p && o.size && o.quantity > 0) migrated.push({ productId: p.id, size: o.size, quantity: Math.min(20, o.quantity) });
        }
        if (migrated.length) setItems((cur) => merge(cur, migrated));
      } catch {
        /* ignore: customer just starts with an empty bag */
      }
    })();
    const onStorage = (e: StorageEvent) => e.key === KEY && setItems(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const add = useCallback((item: CartItem) => setItems((cur) => merge(cur, [item])), []);
  const setQuantity = useCallback(
    (productId: number, size: string, quantity: number) =>
      setItems((cur) =>
        quantity <= 0
          ? cur.filter((i) => !(i.productId === productId && i.size === size))
          : cur.map((i) => (i.productId === productId && i.size === size ? { ...i, quantity: Math.min(20, quantity) } : i)),
      ),
    [],
  );
  const remove = useCallback(
    (productId: number, size: string) => setItems((cur) => cur.filter((i) => !(i.productId === productId && i.size === size))),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(
    () => ({ items, count: items.reduce((n, i) => n + i.quantity, 0), add, setQuantity, remove, clear }),
    [items, add, setQuantity, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function merge(cur: CartItem[], extra: CartItem[]): CartItem[] {
  const next = [...cur];
  for (const e of extra) {
    const i = next.findIndex((x) => x.productId === e.productId && x.size === e.size);
    if (i >= 0) next[i] = { ...next[i]!, quantity: Math.min(20, next[i]!.quantity + e.quantity) };
    else next.push({ ...e });
  }
  return next;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
