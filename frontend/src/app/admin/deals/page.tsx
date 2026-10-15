"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { Notice, Page, adminApi, fromCents, fromLocalInput, toCents, toLocalInput, useAdminData, useNotice } from "../util";

interface Deal { id: number; name: string; buyQty: number; discountPercent: number; active: boolean; startsAt: string | null; endsAt: string | null; productIds: number[] }
interface Promo { id: number; code: string; type: "percent" | "fixed"; value: number; description: string; active: boolean; expiresAt: string | null }

const blankDeal = { name: "", buyQty: 2, discountPercent: 50, active: true, startsAt: null, endsAt: null, productIds: [] as number[] };

function Deals() {
  const { data, reload } = useAdminData<Deal[]>("/admin/deals");
  const { data: products } = useAdminData<Product[]>("/admin/products");
  const { msg, run } = useNotice();
  const [draft, setDraft] = useState<(Omit<Deal, "id"> & { id?: number }) | null>(null);

  const save = () =>
    run(async () => {
      const { id, ...body } = draft!;
      if (id) await adminApi.put(`/admin/deals/${id}`, body);
      else await adminApi.post("/admin/deals", body);
      setDraft(null);
      await reload();
    }, "Deal saved.");

  return (
    <div className="card">
      <div className="flex between"><h2 style={{ margin: 0 }}>Automatic deals</h2><button className="btn-a sm" onClick={() => setDraft({ ...blankDeal })}>+ New deal</button></div>
      <p className="sub" style={{ margin: "6px 0 14px" }}>“Buy N, get a % off the next one.” The cheapest item in each group gets the discount. Applied automatically at checkout. It replaces promo codes when it applies.</p>
      <Notice msg={msg} />
      <div className="t-wrap"><table className="t">
        <tbody>
          {data?.map((d) => (
            <tr key={d.id}>
              <td><b>{d.name}</b><br /><small>Buy {d.buyQty}, get {d.discountPercent}% off the next{d.productIds.length ? ` · ${d.productIds.length} product(s)` : " · all products"}</small></td>
              <td><span className={`pill ${d.active ? "on" : "off"}`}>{d.active ? "Active" : "Off"}</span></td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <button className="btn-a ghost sm" onClick={() => run(async () => { await adminApi.put(`/admin/deals/${d.id}`, { ...d, active: !d.active }); await reload(); }, "Updated.")}>{d.active ? "Turn off" : "Turn on"}</button>{" "}
                <button className="btn-a ghost sm" onClick={() => setDraft(d)}>Edit</button>{" "}
                <button className="btn-a danger sm" onClick={() => confirm(`Delete "${d.name}"?`) && run(async () => { await adminApi.del(`/admin/deals/${d.id}`); await reload(); }, "Deleted.")}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      {draft && (
        <div className="divider">
          <div className="f"><label>Name</label><input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="row c4">
            <div className="f"><label>Buy (qty)</label><input type="number" min={1} max={10} value={draft.buyQty} onChange={(e) => setDraft({ ...draft, buyQty: Number(e.target.value) })} /></div>
            <div className="f"><label>Get % off next</label><input type="number" min={1} max={100} value={draft.discountPercent} onChange={(e) => setDraft({ ...draft, discountPercent: Number(e.target.value) })} /></div>
            <div className="f"><label>Starts (optional)</label><input type="datetime-local" value={toLocalInput(draft.startsAt)} onChange={(e) => setDraft({ ...draft, startsAt: fromLocalInput(e.target.value) })} /></div>
            <div className="f"><label>Ends (optional)</label><input type="datetime-local" value={toLocalInput(draft.endsAt)} onChange={(e) => setDraft({ ...draft, endsAt: fromLocalInput(e.target.value) })} /></div>
          </div>
          <div className="f">
            <label>Products in this deal (none ticked = every product)</label>
            <div className="flex">
              {products?.map((p) => (
                <label className="chk" key={p.id}>
                  <input type="checkbox" checked={draft.productIds.includes(p.id)} onChange={(e) => setDraft({ ...draft, productIds: e.target.checked ? [...draft.productIds, p.id] : draft.productIds.filter((x) => x !== p.id) })} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <label className="chk" style={{ marginBottom: 14 }}><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
          <button className="btn-a" onClick={save} disabled={!draft.name}>Save deal</button>{" "}
          <button className="btn-a ghost" onClick={() => setDraft(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function Promos() {
  const { data, reload } = useAdminData<Promo[]>("/admin/promo-codes");
  const { msg, run } = useNotice();
  const [draft, setDraft] = useState<{ id?: number; code: string; type: "percent" | "fixed"; value: string; description: string; active: boolean; expiresAt: string | null } | null>(null);

  const save = () =>
    run(async () => {
      const d = draft!;
      const body = { code: d.code, type: d.type, value: d.type === "fixed" ? toCents(d.value) : Math.round(Number(d.value)), description: d.description, active: d.active, expiresAt: d.expiresAt };
      if (d.id) await adminApi.put(`/admin/promo-codes/${d.id}`, body);
      else await adminApi.post("/admin/promo-codes", body);
      setDraft(null);
      await reload();
    }, "Promo code saved.");

  return (
    <div className="card">
      <div className="flex between"><h2 style={{ margin: 0 }}>Promo codes</h2><button className="btn-a sm" onClick={() => setDraft({ code: "", type: "percent", value: "10", description: "", active: true, expiresAt: null })}>+ New code</button></div>
      <Notice msg={msg} />
      <div className="t-wrap"><table className="t" style={{ marginTop: 12 }}>
        <thead><tr><th>Code</th><th>Discount</th><th>Expires</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {data?.map((p) => (
            <tr key={p.id}>
              <td><b>{p.code}</b><br /><small>{p.description}</small></td>
              <td>{p.type === "percent" ? `${p.value}%` : `EGP ${p.value / 100}`}</td>
              <td>{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("en-GB") : "Never"}</td>
              <td><span className={`pill ${p.active ? "on" : "off"}`}>{p.active ? "Active" : "Off"}</span></td>
              <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <button className="btn-a ghost sm" onClick={() => setDraft({ id: p.id, code: p.code, type: p.type, value: p.type === "fixed" ? fromCents(p.value) : String(p.value), description: p.description, active: p.active, expiresAt: p.expiresAt })}>Edit</button>{" "}
                <button className="btn-a danger sm" onClick={() => confirm(`Delete ${p.code}?`) && run(async () => { await adminApi.del(`/admin/promo-codes/${p.id}`); await reload(); }, "Deleted.")}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {draft && (
        <div className="divider">
          <div className="row c4">
            <div className="f"><label>Code</label><input type="text" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} /></div>
            <div className="f"><label>Type</label><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as "percent" | "fixed" })}><option value="percent">Percent off</option><option value="fixed">Fixed EGP off</option></select></div>
            <div className="f"><label>{draft.type === "percent" ? "Percent" : "Amount (EGP)"}</label><input type="number" min={1} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} /></div>
            <div className="f"><label>Expires (optional)</label><input type="datetime-local" value={toLocalInput(draft.expiresAt)} onChange={(e) => setDraft({ ...draft, expiresAt: fromLocalInput(e.target.value) })} /></div>
          </div>
          <div className="f"><label>Description</label><input type="text" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          <label className="chk" style={{ marginBottom: 14 }}><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
          <button className="btn-a" onClick={save} disabled={!draft.code || !draft.value}>Save code</button>{" "}
          <button className="btn-a ghost" onClick={() => setDraft(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default function DealsPage() {
  return (
    <Page title="Deals & promo codes" sub="Add products to deals, and manage the codes customers type at checkout.">
      <Deals />
      <Promos />
    </Page>
  );
}
