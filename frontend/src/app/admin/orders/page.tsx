"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Notice, Page, dateTime, egp, useAdminData } from "../util";

const STATUSES = ["", "pending", "confirmed", "shipped", "delivered", "canceled", "returned"];

function Orders() {
  const [status, setStatus] = useState(useSearchParams().get("status") ?? "");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const qs = new URLSearchParams({ ...(status ? { status } : {}), ...(applied ? { q: applied } : {}) }).toString();
  const { data, error } = useAdminData<any[]>(`/admin/orders${qs ? `?${qs}` : ""}`);

  return (
    <Page title="Orders" sub="Click an order to see it and change its status.">
      <Notice msg={error ? { kind: "error", text: error } : null} />
      <div className="chips">
        {STATUSES.map((s) => (
          <button key={s || "all"} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
            {s || "all"}
          </button>
        ))}
      </div>
      <form className="flex" style={{ marginBottom: 16 }} onSubmit={(e) => { e.preventDefault(); setApplied(q); }}>
        <input className="plain" style={{ maxWidth: 340 }} placeholder="Search order #, name, email or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-a">Search</button>
      </form>
      <div className="card t-wrap" style={{ padding: 6 }}>
        <table className="t">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Customer</th><th>Governorate</th><th>Items</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {data?.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`}><b>{o.orderNumber}</b></Link></td>
                <td>{dateTime(o.createdAt)}</td>
                <td>{o.customerName}<br /><small style={{ color: "#666" }}>{o.mobile}</small></td>
                <td>{o.governorate}</td>
                <td>{o.itemCount}</td>
                <td>EGP {egp(o.totalCents)}</td>
                <td><span className={`pill ${o.status}`}>{o.status}</span></td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "#666", padding: 30 }}>No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <Orders />
    </Suspense>
  );
}
