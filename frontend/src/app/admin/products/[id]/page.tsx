"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { Notice, Page, adminApi, fromCents, toCents, useNotice } from "../../util";

interface Tax { id: number; name: string }
interface Form {
  name: string; slug: string; sku: string; subtitle: string; color: string; description: string; material: string; weight: string; fit: string; care: string;
  price: string; comparePrice: string; categoryId: string; collectionId: string; featured: boolean; comingSoon: boolean; active: boolean;
  images: { url: string; alt: string }[]; sizes: { size: string; stock: number }[];
}

const blank: Form = {
  name: "", slug: "", sku: "", subtitle: "", color: "", description: "", material: "100% Cotton", weight: "", fit: "Oversized", care: "Machine wash cold. Hang dry recommended.",
  price: "", comparePrice: "", categoryId: "", collectionId: "", featured: false, comingSoon: false, active: true,
  images: [], sizes: ["S", "M", "L", "XL"].map((size) => ({ size, stock: 0 })),
};

export default function ProductEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const { msg, run } = useNotice();
  const [f, setF] = useState<Form>(blank);
  const [cats, setCats] = useState<Tax[]>([]);
  const [cols, setCols] = useState<Tax[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newSize, setNewSize] = useState("");

  useEffect(() => {
    api<Tax[]>("/admin/categories", { admin: true }).then(setCats).catch(() => {});
    api<Tax[]>("/admin/collections", { admin: true }).then(setCols).catch(() => {});
    if (!isNew)
      api<Product>(`/admin/products/${id}`, { admin: true }).then((p) =>
        setF({
          name: p.name, slug: p.slug, sku: p.sku, subtitle: p.subtitle, color: p.color, description: p.description, material: p.material, weight: p.weight, fit: p.fit, care: p.care,
          price: fromCents(p.priceCents), comparePrice: fromCents(p.comparePriceCents), categoryId: String(p.category?.id ?? ""), collectionId: String(p.collection?.id ?? ""),
          featured: p.featured, comingSoon: p.comingSoon, active: p.active, images: p.images, sizes: p.sizes,
        }),
      );
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const txt = (k: keyof Form) => ({ value: f[k] as string, onChange: (e: { target: { value: string } }) => set(k, e.target.value as never) });

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    await run(async () => {
      const added: { url: string; alt: string }[] = [];
      for (const file of Array.from(files)) {
        const r = await api<{ url: string }>("/admin/uploads", { admin: true, raw: { data: file, type: file.type || "image/jpeg" } });
        added.push({ url: r.url, alt: f.name });
      }
      setF((cur) => ({ ...cur, images: [...cur.images, ...added] }));
    }, "Image uploaded. Save the product to keep it.");
    setUploading(false);
  }

  function save(e: FormEvent) {
    e.preventDefault();
    return run(async () => {
      const body = {
        name: f.name, slug: f.slug || undefined, sku: f.sku, subtitle: f.subtitle, color: f.color, description: f.description, material: f.material, weight: f.weight, fit: f.fit, care: f.care,
        priceCents: toCents(f.price), comparePriceCents: f.comparePrice ? toCents(f.comparePrice) : null,
        categoryId: f.categoryId ? Number(f.categoryId) : null, collectionId: f.collectionId ? Number(f.collectionId) : null,
        featured: f.featured, comingSoon: f.comingSoon, active: f.active, images: f.images, sizes: f.sizes,
      };
      const saved = isNew ? await adminApi.post<Product>("/admin/products", body) : await adminApi.put<Product>(`/admin/products/${id}`, body);
      if (isNew) router.replace(`/admin/products/${saved.id}`);
    }, "Product saved.");
  }

  async function remove() {
    if (!confirm(`Delete "${f.name}" permanently? Past orders keep their details. Hiding it is usually better.`)) return;
    if (await run(() => adminApi.del(`/admin/products/${id}`), "Deleted.")) router.replace("/admin/products");
  }

  return (
    <Page title={isNew ? "New product" : f.name || "Product"} action={<Link className="btn-a ghost" href="/admin/products">← Products</Link>}>
      <Notice msg={msg} />
      <form onSubmit={save}>
        <div className="row c2" style={{ alignItems: "start" }}>
          <div>
            <div className="card">
              <h2>Details</h2>
              <div className="f"><label>Name</label><input type="text" required {...txt("name")} /></div>
              <div className="row c2">
                <div className="f"><label>SKU</label><input type="text" required {...txt("sku")} /></div>
                <div className="f"><label>URL name (optional)</label><input type="text" {...txt("slug")} placeholder="auto from name" /></div>
              </div>
              <div className="f"><label>Subtitle</label><input type="text" {...txt("subtitle")} placeholder="Heavyweight Essential Hoodie" /></div>
              <div className="f"><label>Description</label><textarea rows={4} {...txt("description")} /></div>
              <div className="row c3">
                <div className="f"><label>Colour</label><input type="text" {...txt("color")} /></div>
                <div className="f"><label>Material</label><input type="text" {...txt("material")} /></div>
                <div className="f"><label>Weight</label><input type="text" {...txt("weight")} placeholder="420 GSM" /></div>
              </div>
              <div className="row c2">
                <div className="f"><label>Fit</label><input type="text" {...txt("fit")} /></div>
                <div className="f"><label>Care</label><input type="text" {...txt("care")} /></div>
              </div>
            </div>

            <div className="card">
              <h2>Sizes &amp; stock</h2>
              <div className="sizes-grid">
                {f.sizes.map((s, i) => (
                  <div className="sz" key={s.size}>
                    <b>{s.size}<button type="button" aria-label={`Remove ${s.size}`} onClick={() => set("sizes", f.sizes.filter((_, j) => j !== i))}>×</button></b>
                    <input className="plain" type="number" min={0} value={s.stock} onChange={(e) => set("sizes", f.sizes.map((x, j) => (j === i ? { ...x, stock: Math.max(0, Number(e.target.value) || 0) } : x)))} />
                  </div>
                ))}
              </div>
              <div className="flex" style={{ marginTop: 12 }}>
                <input className="plain" style={{ maxWidth: 120 }} placeholder="New size" value={newSize} onChange={(e) => setNewSize(e.target.value.toUpperCase())} />
                <button type="button" className="btn-a ghost sm" onClick={() => { if (newSize && !f.sizes.some((s) => s.size === newSize)) { set("sizes", [...f.sizes, { size: newSize, stock: 0 }]); setNewSize(""); } }}>Add size</button>
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <h2>Price &amp; visibility</h2>
              <div className="row c2">
                <div className="f"><label>Price (EGP)</label><input type="number" step="0.01" min="0" required {...txt("price")} /></div>
                <div className="f"><label>Compare-at price</label><input type="number" step="0.01" min="0" {...txt("comparePrice")} /></div>
              </div>
              <div className="row c2">
                <div className="f"><label>Category</label>
                  <select {...txt("categoryId")}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="f"><label>Collection</label>
                  <select {...txt("collectionId")}><option value="">None</option>{cols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <label className="chk"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Visible in the store</label>
              <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured on the home page</label>
              <label className="chk" style={{ marginTop: 8 }}><input type="checkbox" checked={f.comingSoon} onChange={(e) => set("comingSoon", e.target.checked)} /> Coming soon (can't be ordered)</label>
            </div>

            <div className="card">
              <h2>Images</h2>
              <p className="sub" style={{ margin: "0 0 8px" }}>The first image is the main one. JPG, PNG or WebP, up to 6 MB.</p>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={(e) => upload(e.target.files)} />
              <div className="thumbs">
                {f.images.map((img, i) => (
                  <div className="th" key={img.url + i}>
                    <img src={img.url} alt="" />
                    <button type="button" aria-label="Remove image" onClick={() => set("images", f.images.filter((_, j) => j !== i))}>×</button>
                    {i > 0 && <button type="button" className="btn-a ghost sm" style={{ width: "100%", marginTop: 4, position: "static" , borderRadius: 4, height: "auto"}} onClick={() => set("images", [img, ...f.images.filter((_, j) => j !== i)])}>Make main</button>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex">
              <button className="btn-a">{isNew ? "Create product" : "Save changes"}</button>
              {!isNew && <button type="button" className="btn-a danger" onClick={remove}>Delete</button>}
            </div>
          </div>
        </div>
      </form>
    </Page>
  );
}
