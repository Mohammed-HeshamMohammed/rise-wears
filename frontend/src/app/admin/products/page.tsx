"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { Notice, Page, adminApi, egp, useAdminData, useNotice } from "../util";

export default function ProductsPage() {
  const { data, error, reload } = useAdminData<Product[]>("/admin/products");
  const { msg, run } = useNotice();

  const toggle = (p: Product, patch: Partial<Product>) =>
    run(async () => {
      await adminApi.put(`/admin/products/${p.id}`, {
        ...p, categoryId: p.category?.id ?? null, collectionId: p.collection?.id ?? null, ...patch,
      });
      await reload();
    }, "Updated.");

  return (
    <Page
      title="Products"
      sub="Items shown in the store. Hide a product to remove it from the shop without deleting it."
      action={<Link className="btn-a" href="/admin/products/new">+ Add product</Link>}
    >
      <Notice msg={msg ?? (error ? { kind: "error", text: error } : null)} />
      <div className="card t-wrap" style={{ padding: 6 }}>
        <table className="t">
          <thead>
            <tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visible</th><th>Featured</th><th></th></tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id}>
                <td style={{ width: 56 }}>{p.images[0] && <img src={p.images[0].url} alt="" />}</td>
                <td><Link href={`/admin/products/${p.id}`}><b>{p.name}</b></Link><br /><small style={{ color: "#666" }}>{p.sku}</small></td>
                <td>{p.category?.name ?? "—"}<br /><small style={{ color: "#666" }}>{p.collection?.name}</small></td>
                <td>EGP {egp(p.priceCents)}</td>
                <td>
                  {p.sizes.map((s) => (
                    <span key={s.size} className={`pill ${s.stock > 0 ? "" : "off"}`} style={{ marginRight: 4 }}>{s.size}:{s.stock}</span>
                  ))}
                </td>
                <td><button className={`pill ${p.active ? "on" : "off"}`} style={{ border: 0, cursor: "pointer" }} onClick={() => toggle(p, { active: !p.active })}>{p.active ? "Shown" : "Hidden"}</button></td>
                <td><button className={`pill ${p.featured ? "on" : ""}`} style={{ border: 0, cursor: "pointer" }} onClick={() => toggle(p, { featured: !p.featured })}>{p.featured ? "Yes" : "No"}</button></td>
                <td><Link className="btn-a ghost sm" href={`/admin/products/${p.id}`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
