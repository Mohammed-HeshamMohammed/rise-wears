import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function ProductCard({ product, shopButton = false }: { product: Product; shopButton?: boolean }) {
  const image = product.images[0]?.url ?? "/images/logo.png";
  return (
    <Link href={`/products/${product.slug}`} className={`product-card${product.soldOut ? " rise-sold-out" : ""}`}>
      {product.soldOut && <span className="rise-sold-out-badge">SOLD OUT</span>}
      <img src={image} alt={product.images[0]?.alt || product.name} loading="lazy" />
      <h3>{product.name}</h3>
      <span>{formatPrice(product.priceCents)}</span>
      {shopButton && (
        <div className="shop-btn">
          Shop Now <i className="fa-solid fa-arrow-right"></i>
        </div>
      )}
    </Link>
  );
}
