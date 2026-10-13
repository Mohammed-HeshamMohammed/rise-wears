"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Notice, Page, adminApi, dateTime, egp, useAdminData, useNotice } from "../../util";

const NEXT: Record<string, string[]> = {
  pending: ["confirmed", "canceled"],
  confirmed: ["shipped", "canceled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  canceled: [],
  returned: [],
};

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: o, error, reload } = useAdminData<any>(`/admin/orders/${id}`);
  const { msg, run } = useNotice();
  const [note, setNote] = useState("");

  if (error) return <Notice msg={{ kind: "error", text: error }} />;
  if (!o) return <p>Loading…</p>;

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
      <div className="row c2" style={{ alignItems: "start" }}>
        <div>
          <div className="card">
            <div className="flex between"><h2 style={{ margin: 0 }}>Items</h2><span className={`pill ${o.status}`}>{o.status}</span></div>
            <table className="t" style={{ marginTop: 10 }}>
              <tbody>
                {o.items.map((i: any) => (
                  <tr key={i.id}>
                    <td style={{ width: 54 }}><img src={i.image_url || "/images/logo.png"} alt="" /></td>
                    <td>{i.product_name}<br /><small style={{ color: "#666" }}>{i.color} · Size {i.size}</small></td>
                    <td>× {i.quantity}</td>
                    <td style={{ textAlign: "right" }}>EGP {egp(i.unit_price_cents * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>Subtotal</dt><dd>EGP {egp(o.subtotal_cents)}</dd>
              <dt>Discount{o.promo_code ? ` (${o.promo_code})` : ""}</dt><dd>- EGP {egp(o.discount_cents)}</dd>
              <dt>Shipping</dt><dd>EGP {egp(o.shipping_cents)}</dd>
              <dt><b>Total (COD)</b></dt><dd><b>EGP {egp(o.total_cents)}</b></dd>
            </dl>
          </div>
          <div className="card">
            <h2>Customer</h2>
            <dl className="kv">
              <dt>Name</dt><dd>{o.customer_name}</dd>
              <dt>Mobile</dt><dd><a href={`tel:${o.mobile}`}>{o.mobile}</a></dd>
              <dt>Email</dt><dd>{o.email}</dd>
              <dt>Address</dt><dd>{o.address}{o.apartment ? `, ${o.apartment}` : ""}<br />{o.city}, {o.governorate}</dd>
              {o.notes && (<><dt>Notes</dt><dd>{o.notes}</dd></>)}
            </dl>
          </div>
        </div>
        <div>
          <div className="card">
            <h2>Update status</h2>
            {NEXT[o.status]?.length ? (
              <>
                <div className="f"><label>Note (optional)</label><input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer confirmed by phone" /></div>
                <div className="flex">
                  {NEXT[o.status]!.map((s) => (
                    <button key={s} className={`btn-a${s === "canceled" || s === "returned" ? " danger" : ""}`} onClick={() => move(s)}>
                      Mark {s}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="sub" style={{ margin: 0 }}>This order is {o.status}. No further changes.</p>
            )}
          </div>
          <div className="card">
            <h2>History</h2>
            {o.history.map((h: any) => (
              <p key={h.id} style={{ margin: "0 0 10px" }}>
                <span className={`pill ${h.status}`}>{h.status}</span> <small style={{ color: "#666" }}>{dateTime(h.created_at)}{h.note ? ` · ${h.note}` : ""}</small>
              </p>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
