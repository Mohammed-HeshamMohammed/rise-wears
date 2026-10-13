"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

const LOW_STOCK = 3;

function chartFor(p: Product): { src: string; alt: string } | null {
  const hay = `${p.category?.name ?? ""} ${p.collection?.name ?? ""}`.toLowerCase();
  if (hay.includes("pant")) return { src: "/images/size-chart-pants.png", alt: "pants size chart" };
  if (/top|shirt|hoodie|sweat|tee/.test(hay)) return { src: "/images/size-chart-tops.png", alt: "tops size chart" };
  return null;
}

export default function ProductView({ product }: { product: Product }) {
  const { add } = useCart();
  const [image, setImage] = useState(product.images[0]?.url ?? "/images/logo.png");
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState<{ text: string; kind: "error" | "success"; show: boolean }>({ text: "", kind: "success", show: false });
  const [chartOpen, setChartOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const chart = chartFor(product);

  const stockFor = (s: string | null) => (s ? (product.sizes.find((x) => x.size === s)?.stock ?? 0) : null);
  const stock = stockFor(size);

  function notify(text: string, kind: "error" | "success") {
    setNote({ text, kind, show: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote((n) => ({ ...n, show: false })), 3500);
  }

  useEffect(() => {
    document.body.classList.toggle("size-chart-open", chartOpen);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setChartOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("size-chart-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [chartOpen]);

  function addToCart() {
    if (!size) return notify("Please select a size first", "error");
    if (!stock || stock <= 0) return notify("That size is sold out", "error");
    if (quantity > stock) return notify(`Only ${stock} left in size ${size}`, "error");
    add({ productId: product.id, size, quantity });
    notify("Added to your cart", "success");
  }

  return (
    <>
      <div id="cart-notification" className={`cart-notification ${note.kind}${note.show ? " show" : ""}`} role="status" aria-live="polite">
        {note.text}
      </div>
      <div className="container product-layout">
        <div className="product-gallery">
          <div className="thumbnails" id="thumbnail-container">
            {product.images.map((img, i) => (
              <img
                key={img.url}
                src={img.url}
                alt={`${product.name} image ${i + 1}`}
                className="thumbnail"
                tabIndex={0}
                onClick={() => setImage(img.url)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setImage(img.url);
                  }
                }}
              />
            ))}
          </div>
          <div className="main-image">
            <img id="main-image" src={image} alt={product.name} />
          </div>
        </div>

        <div className="product-info">
          <span className="section-title">{product.collection?.name ?? ""}</span>
          <h1>{product.name}</h1>
          <h3>{product.subtitle}</h3>
          <div className="price">{formatPrice(product.priceCents)}</div>
          <p>{product.description}</p>
          <div className="product-meta">
            {product.material && (
              <p>
                <strong>Material:</strong> <span>{product.material}</span>
              </p>
            )}
            {product.weight && (
              <p>
                <strong>Weight:</strong> <span>{product.weight}</span>
              </p>
            )}
            {product.fit && (
              <p>
                <strong>Fit:</strong> <span>{product.fit}</span>
              </p>
            )}
          </div>

          <div className="sizes">
            <h4>Select Size</h4>
            <div id="size-container">
              {product.sizes.map((s) => {
                const out = s.stock <= 0;
                return (
                  <button
                    key={s.size}
                    type="button"
                    className={`size-btn${size === s.size ? " selected" : ""}${out ? " sold-out" : ""}`}
                    disabled={out}
                    onClick={() => {
                      setSize(s.size);
                      setQuantity((q) => Math.min(q, s.stock));
                    }}
                  >
                    {s.size}
                  </button>
                );
              })}
            </div>
            {chart && (
              <button type="button" id="size-chart-button" className="size-chart-button" onClick={() => setChartOpen(true)}>
                View size chart
              </button>
            )}
            <p id="stock-note" className={stock === 0 ? "out" : ""}>
              {product.soldOut ? "Sold out" : stock !== null && stock > 0 && stock <= LOW_STOCK ? `Only ${stock} left in size ${size}` : ""}
            </p>
          </div>

          <div className="quantity">
            <h4>Quantity</h4>
            <div className="quantity-box">
              <button id="minus" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                -
              </button>
              <span id="quantity">{quantity}</span>
              <button id="plus" onClick={() => setQuantity((q) => Math.min(stock ?? 20, q + 1))}>
                +
              </button>
            </div>
          </div>

          <button
            className={`btn btn-dark add-cart${product.soldOut ? " is-sold-out" : ""}`}
            id="add-cart"
            disabled={product.soldOut}
            onClick={addToCart}
          >
            {product.soldOut ? "SOLD OUT" : "ADD TO CART"}
            {!product.soldOut && <span className="button-arrow">↑</span>}
          </button>

          <div className="benefits">
            <p>
              <i className="fa-solid fa-truck"></i> Shipping All Over Egypt
            </p>
            <p>
              <i className="fa-solid fa-arrow-rotate-left"></i> 14-Day Returns
            </p>
            <p>
              <i className="fa-solid fa-lock"></i> Secure Checkout
            </p>
          </div>
        </div>
      </div>

      {chart && (
        <div id="size-chart-modal" className="size-chart-modal" hidden={!chartOpen} role="dialog" aria-modal="true" aria-labelledby="size-chart-title" onClick={(e) => e.target === e.currentTarget && setChartOpen(false)}>
          <div className="size-chart-dialog">
            <button id="close-size-chart" type="button" className="close-size-chart" aria-label="Close size chart" onClick={() => setChartOpen(false)}>
              ×
            </button>
            <h2 id="size-chart-title">Size chart</h2>
            <img id="size-chart-image" src={chart.src} alt={chart.alt} />
          </div>
        </div>
      )}
    </>
  );
}
