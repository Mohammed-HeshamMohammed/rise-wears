"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { Notice, Page, adminApi, egp, useAdminData, useNotice } from "../util";

export default function ProductsPage() {
  const { data, error, reload } = useAdminData<Product[]>("/admin/products");
  const { msg, run } = useNotice();
  const [q, setQ] = useState("");

  const toggle = (p: Product, patch: Partial<Product>) =>
    run(async () => {
      await adminApi.put(`/admin/products/${p.id}`, {
        ...p, categoryId: p.category?.id ?? null, collectionId: p.collection?.id ?? null, ...patch,
      });
      await reload();
    }, "Updated.");

  const needle = q.trim().toLowerCase();
  const rows = (data ?? []).filter((p) => !needle || [p.name, p.sku, p.category?.name ?? "", p.collection?.name ?? ""].some((v) => v.toLowerCase().includes(needle)));

  return (
    <Page
      title="Products"
      sub="Everything in the shop. Hide a product to take it off the store without deleting it."
      action={<Link className="btn-a" href="/admin/products/new">+ Add product</Link>}
    >
      <Notice msg={msg ?? (error ? { kind: "error", text: error } : null)} />
      <div className="flex" style={{ marginBottom: 16 }}>
        <div className="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input className="plain" type="search" aria-label="Search products" placeholder="Search name, SKU or category" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="muted small">{rows.length} {rows.length === 1 ? "product" : "products"}</span>
      </div>
      <div className="card flush t-wrap">
        <table className="t stack-m">
          <thead>
            <tr><th><span className="sr">Photo</span></th><th>Product</th><th>Category</th><th className="right">Price</th><th>Stock by size</th><th>Visible</th><th>Featured</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td style={{ width: 60 }}>{p.images[0] && <img src={p.images[0].url} alt="" />}</td>
                <td data-label="Product"><Link className="link-strong" href={`/admin/products/${p.id}`}>{p.name}</Link><br /><small>{p.sku}</small></td>
                <td data-label="Category">{p.category?.name ?? "None"}<br /><small>{p.collection?.name}</small></td>
                <td data-label="Price" className="right num">EGP {egp(p.priceCents)}</td>
                <td data-label="Stock">
                  <span className="flex" style={{ gap: 6 }}>
                    {p.sizes.map((s) => (
                      <span key={s.size} className={`size-chip ${s.stock <= 0 ? "out" : s.stock <= 3 ? "low" : ""}`} title={s.stock <= 0 ? "Sold out" : `${s.stock} in stock`}>
                        {s.size} · {s.stock}
                      </span>
                    ))}
                  </span>
                </td>
                <td data-label="Visible"><button className={`pill ${p.active ? "on" : "off"}`} aria-label={`${p.name} is ${p.active ? "shown" : "hidden"}. Click to change`} onClick={() => toggle(p, { active: !p.active })}>{p.active ? "Shown" : "Hidden"}</button></td>
                <td data-label="Featured"><button className={`pill ${p.featured ? "on" : ""}`} aria-label={`${p.name} featured: ${p.featured ? "yes" : "no"}. Click to change`} onClick={() => toggle(p, { featured: !p.featured })}>{p.featured ? "Featured" : "Not featured"}</button></td>
                <td><Link className="btn-a ghost sm" href={`/admin/products/${p.id}`}>Edit</Link></td>
              </tr>
            ))}
            {data && rows.length === 0 && <tr><td colSpan={8}><div className="empty"><b>No products found</b>Try a different search.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
