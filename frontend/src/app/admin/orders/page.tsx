"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { STATUS_LABEL, STATUSES } from "@/lib/orders";
import { Notice, Page, adminApi, dateTime, egp, useAdminData, useNotice } from "../util";

type Row = { id: number; orderNumber: string; status: keyof typeof STATUS_LABEL; createdAt: string; customerName: string; email: string; mobile: string; governorate: string; totalCents: number; itemCount: number };

function Orders() {
  const params = useSearchParams().get("status");
  const [status, setStatus] = useState<string>(params && (STATUSES as string[]).includes(params) ? params : "all");
  const [q, setQ] = useState("");
  const { data, error, reload } = useAdminData<Row[]>("/admin/orders");
  const { msg, run } = useNotice();

  const change = (o: Row, to: string) => {
    const warning = to === "canceled" ? " Stock will be returned to the shop." : o.status === "canceled" ? " Stock will be taken from the shop again." : "";
    if (!confirm(`Change ${o.orderNumber} from ${STATUS_LABEL[o.status]} to ${STATUS_LABEL[to as keyof typeof STATUS_LABEL]}?${warning}`)) return;
    return run(async () => {
      await adminApi.patch(`/admin/orders/${o.id}/status`, { status: to });
      await reload();
    }, `${o.orderNumber} is now ${STATUS_LABEL[to as keyof typeof STATUS_LABEL]}.`);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.length ?? 0 };
    for (const o of data ?? []) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [data]);

  const needle = q.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (o) => (status === "all" || o.status === status) && (!needle || [o.orderNumber, o.customerName, o.email, o.mobile].some((v) => v.toLowerCase().includes(needle))),
  );

  return (
    <Page title="Orders" sub="Open an order to see what was bought, call the customer and update its status.">
      <Notice msg={error ? { kind: "error", text: error } : msg} />
      <div className="tabs" role="group" aria-label="Filter by status">
        {["all", ...STATUSES].map((s) => (
          <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s === "all" ? "All" : STATUS_LABEL[s as keyof typeof STATUS_LABEL]}
            <span className="n">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="flex" style={{ marginBottom: 16 }}>
        <div className="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input className="plain" type="search" aria-label="Search orders" placeholder="Search order number, name, email or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="muted small">{rows.length} {rows.length === 1 ? "order" : "orders"}</span>
      </div>
      <div className="card flush t-wrap">
        <table className="t stack-m">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Customer</th><th>Governorate</th><th className="right">Items</th><th className="right">Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td data-label="Order"><Link className="link-strong" href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link></td>
                <td data-label="Date" className="muted">{dateTime(o.createdAt)}</td>
                <td data-label="Customer">{o.customerName}<br /><small>{o.mobile}</small></td>
                <td data-label="Governorate">{o.governorate}</td>
                <td data-label="Items" className="right num">{o.itemCount}</td>
                <td data-label="Total" className="right num">EGP {egp(o.totalCents)}</td>
                <td data-label="Status">
                  <select className={`status-select ${o.status}`} aria-label={`Status of ${o.orderNumber}`} value={o.status} onChange={(e) => change(o, e.target.value)}>
                    {STATUSES.map((st) => (<option key={st} value={st}>{STATUS_LABEL[st]}</option>))}
                  </select>
                </td>
              </tr>
            ))}
            {data && rows.length === 0 && (
              <tr><td colSpan={7}><div className="empty"><b>No orders found</b>{needle ? "Try a different search." : "Orders with this status will show up here."}</div></td></tr>
            )}
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
