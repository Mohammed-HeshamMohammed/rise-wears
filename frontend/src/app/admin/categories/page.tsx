"use client";

import { useState } from "react";
import { Notice, Page, adminApi, useAdminData, useNotice } from "../util";

interface Tax { id: number; name: string; slug: string; sortOrder: number }

function TaxCard({ title, path, hint }: { title: string; path: string; hint: string }) {
  const { data, reload } = useAdminData<Tax[]>(path);
  const { msg, run } = useNotice();
  const [name, setName] = useState("");
  const [edit, setEdit] = useState<Tax | null>(null);

  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="sub" style={{ marginTop: -6 }}>{hint}</p>
      <Notice msg={msg} />
      <div className="t-wrap"><table className="t">
        <tbody>
          {data?.map((t) => (
            <tr key={t.id}>
              <td>{edit?.id === t.id ? <input className="plain" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /> : <b>{t.name}</b>}<br /><small>/{t.slug}</small></td>
              <td style={{ width: 90 }}>{edit?.id === t.id ? <input className="plain" type="number" title="Order" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: Number(e.target.value) })} /> : `#${t.sortOrder}`}</td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                {edit?.id === t.id ? (
                  <>
                    <button className="btn-a sm" onClick={() => run(async () => { await adminApi.put(`${path}/${t.id}`, { name: edit.name, sortOrder: edit.sortOrder }); setEdit(null); await reload(); })}>Save</button>{" "}
                    <button className="btn-a ghost sm" onClick={() => setEdit(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn-a ghost sm" onClick={() => setEdit(t)}>Edit</button>{" "}
                    <button className="btn-a danger sm" onClick={() => confirm(`Delete "${t.name}"? Products in it become uncategorised.`) && run(async () => { await adminApi.del(`${path}/${t.id}`); await reload(); }, "Deleted.")}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <form className="flex" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); run(async () => { await adminApi.post(path, { name, sortOrder: (data?.length ?? 0) }); setName(""); await reload(); }, "Added."); }}>
        <input className="plain" style={{ maxWidth: 260 }} placeholder="New name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="btn-a">Add</button>
      </form>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Page title="Categories & collections" sub="Categories are the shop filters (Tops, Pants…). Collections are drops (Drop 001…).">
      <TaxCard title="Categories" path="/admin/categories" hint="Shown as filter buttons on the shop page." />
      <TaxCard title="Collections" path="/admin/collections" hint="Shown above the product name, e.g. “Drop 002”." />
    </Page>
  );
}
