"use client";

import Link from "next/link";
import { use, useState } from "react";
import { STATUS_LABEL } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";
import { Notice, Page, adminApi, dateTime, egp, useAdminData, useNotice } from "../../util";

const NEXT: Record<string, string[]> = {
  pending: ["confirmed", "canceled"],
  confirmed: ["shipped", "canceled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  canceled: [],
  returned: [],
};
const PATH: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered"];
const whatsapp = (mobile: string) => `https://wa.me/${mobile.replace(/\D/g, "").replace(/^0/, "20")}`;

function Progress({ status, history }: { status: OrderStatus; history: { status: OrderStatus }[] }) {
  const reached = new Set(history.map((h) => h.status));
  const ended = status === "canceled" || status === "returned";
  return (
    <ol className={`steps${ended ? " ended" : ""}`} aria-label="Order progress">
      {PATH.map((s) => (
        <li key={s} className={s === status ? "now" : reached.has(s) ? "done" : ""} aria-current={s === status ? "step" : undefined}>
          {STATUS_LABEL[s]}
        </li>
      ))}
      {ended && <li className="now" aria-current="step">{STATUS_LABEL[status]}</li>}
    </ol>
  );
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: o, error, reload } = useAdminData<any>(`/admin/orders/${id}`);
  const { msg, run } = useNotice();
  const [note, setNote] = useState("");

  if (error) return <Notice msg={{ kind: "error", text: error }} />;
  if (!o) return <p className="muted">Loading…</p>;

  const move = (status: string) =>
    run(async () => {
      if ((status === "canceled" || status === "returned") && !confirm(`Mark this order as ${status}?${status === "canceled" ? " Stock will be returned to the shop." : ""}`)) throw new Error("Not changed.");
      await adminApi.patch(`/admin/orders/${id}/status`, { status, note });
      setNote("");
      await reload();
    }, `Order marked ${status}.`);

  return (
    <Page title={o.order_number} sub={`Placed ${dateTime(o.created_at)}`} action={<Link className="btn-a ghost" href="/admin/orders">← All orders</Link>}>
      <Notice msg={msg} />
      <div className="card"><Progress status={o.status} history={o.history} /></div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="stack">
          <section className="card" style={{ marginBottom: 0 }}>
            <div className="card-head"><h2>Items</h2><span className={`pill ${o.status}`}>{STATUS_LABEL[o.status as OrderStatus]}</span></div>
            <div className="t-wrap">
              <table className="t">
                <tbody>
                  {o.items.map((i: any) => (
                    <tr key={i.id}>
                      <td style={{ width: 60 }}><img src={i.image_url || "/images/logo.png"} alt="" /></td>
                      <td><b>{i.product_name}</b><br /><small>{i.color} · Size {i.size}</small></td>
                      <td className="num">× {i.quantity}</td>
                      <td className="right num">EGP {egp(i.unit_price_cents * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="kv" style={{ marginTop: 16, gridTemplateColumns: "1fr auto" }}>
              <dt>Subtotal</dt><dd className="num">EGP {egp(o.subtotal_cents)}</dd>
              <dt>Discount{o.promo_code ? ` (${o.promo_code})` : ""}</dt><dd className="num">− EGP {egp(o.discount_cents)}</dd>
              <dt>Shipping</dt><dd className="num">EGP {egp(o.shipping_cents)}</dd>
              <dt><b>Total, cash on delivery</b></dt><dd className="num"><b>EGP {egp(o.total_cents)}</b></dd>
            </dl>
          </section>

          <section className="card" style={{ marginBottom: 0 }}>
            <h2>Customer</h2>
            <dl className="kv">
              <dt>Name</dt><dd>{o.customer_name}</dd>
              <dt>Mobile</dt><dd>{o.mobile}</dd>
              <dt>Email</dt><dd>{o.email}</dd>
              <dt>Address</dt><dd>{o.address}{o.apartment ? `, ${o.apartment}` : ""}<br />{o.city}, {o.governorate}</dd>
              {o.notes && (<><dt>Notes</dt><dd>{o.notes}</dd></>)}
            </dl>
            <div className="flex" style={{ marginTop: 14 }}>
              <a className="btn-a ghost sm" href={`tel:${o.mobile}`}>Call</a>
              <a className="btn-a ghost sm" href={whatsapp(o.mobile)} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="btn-a ghost sm" href={`mailto:${o.email}`}>Email</a>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card" style={{ marginBottom: 0 }}>
            <h2>Update status</h2>
            {NEXT[o.status]?.length ? (
              <>
                <div className="f"><label htmlFor="note">Note (optional)</label><input id="note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer confirmed by phone" /></div>
                <div className="flex">
                  {NEXT[o.status]!.map((s) => (
                    <button key={s} className={`btn-a${s === "canceled" || s === "returned" ? " danger" : ""}`} onClick={() => move(s)}>
                      Mark {s}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>This order is {o.status}. No further changes are possible.</p>
            )}
          </section>
          <section className="card" style={{ marginBottom: 0 }}>
            <h2>History</h2>
            <ul className="list">
              {o.history.map((h: any) => (
                <li key={h.id}>
                  <span className={`dot ${h.status}`} />
                  <div className="grow"><b>{STATUS_LABEL[h.status as OrderStatus]}</b><span>{dateTime(h.created_at)}{h.note ? ` · ${h.note}` : ""}</span></div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Page>
  );
}
