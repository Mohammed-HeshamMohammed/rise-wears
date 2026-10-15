"use client";

import Link from "next/link";
import { useState } from "react";
import { STATUS_LABEL, STATUSES } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";
import { AreaChart } from "./charts";
import { Notice, useAdminData } from "./util";

interface Stats {
  orders: number; pending: number; revenueCents: number; products: number; active: number; customers: number; subscribers: number; recentMessages: number;
  period: { days: number; revenueCents: number; orders: number; prevRevenueCents: number; prevOrders: number };
  daily: { date: string; revenueCents: number; orders: number }[];
  statusCounts: Record<string, number>;
  topProducts: { name: string; units: number; revenueCents: number; imageUrl: string }[];
  lowStock: { productId: number; name: string; slug: string; size: string; stock: number }[];
  lowStockAt: number;
  recentOrders: { id: number; orderNumber: string; status: OrderStatus; createdAt: string; customerName: string; totalCents: number }[];
}

const PERIODS = [7, 14, 30, 90];
const pounds = (cents: number) => `EGP ${Math.round(cents / 100).toLocaleString("en-US")}`;
const short = (cents: number) => {
  const v = cents / 100;
  return v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(Math.round(v));
};
const dayLabel = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const ago = (iso: string) => {
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
};

function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  if (before === 0 && now === 0) return <span className="hint">No orders in either period</span>;
  if (before === 0) return <span className="hint"><span className="delta up">New</span> nothing in the previous {days} days</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const cls = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return (
    <span className="hint">
      <span className={`delta ${cls}`}>
        <span aria-hidden="true">{pct > 0 ? "▲" : pct < 0 ? "▼" : "■"}</span>
        {pct > 0 ? "+" : ""}{pct}%
      </span>
      vs previous {days} days
    </span>
  );
}

export default function AdminDashboard() {
  const [days, setDays] = useState(14);
  const { data: s, error } = useAdminData<Stats>(`/admin/stats?days=${days}`);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (!s)
    return (
      <>
        <div className="page-head"><div><h1>Dashboard</h1><p className="sub">Loading your store…</p></div></div>
        <Notice msg={error ? { kind: "error", text: error } : null} />
      </>
    );

  const p = s.period;
  const aov = p.orders ? Math.round(p.revenueCents / p.orders) : 0;
  const prevAov = p.prevOrders ? Math.round(p.prevRevenueCents / p.prevOrders) : 0;
  const total = Object.values(s.statusCounts).reduce((n, v) => n + v, 0);
  const soldOut = s.lowStock.filter((x) => x.stock <= 0).length;
  const topUnits = Math.max(1, ...s.topProducts.map((t) => t.units));
  const lowByProduct = [...s.lowStock.reduce((m, x) => m.set(x.productId, { productId: x.productId, name: x.name, sizes: [...(m.get(x.productId)?.sizes ?? []), x] }), new Map<number, { productId: number; name: string; sizes: Stats["lowStock"] }>()).values()];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting}</h1>
          <p className="sub">Here is how RISE is doing. {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}.</p>
        </div>
        <div className="seg" role="group" aria-label="Time period">
          {PERIODS.map((d) => (
            <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>
              {d} days
            </button>
          ))}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="label">Revenue</span>
          <span className="value">{pounds(p.revenueCents)}</span>
          <Delta now={p.revenueCents} before={p.prevRevenueCents} days={p.days} />
        </div>
        <div className="kpi">
          <span className="label">Orders</span>
          <span className="value">{p.orders}</span>
          <Delta now={p.orders} before={p.prevOrders} days={p.days} />
        </div>
        <div className="kpi">
          <span className="label">Average order</span>
          <span className="value">{p.orders ? pounds(aov) : "–"}</span>
          {p.orders ? <Delta now={aov} before={prevAov} days={p.days} /> : <span className="hint">No orders yet</span>}
        </div>
        {s.pending > 0 ? (
          <Link href="/admin/orders?status=pending" className="kpi alert">
            <span className="label">Needs confirming</span>
            <span className="value">{s.pending}</span>
            <span className="hint">pending {s.pending === 1 ? "order is" : "orders are"} waiting for you →</span>
          </Link>
        ) : (
          <div className="kpi">
            <span className="label">Needs confirming</span>
            <span className="value">0</span>
            <span className="hint">All caught up</span>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <section className="card" aria-labelledby="rev-h">
          <div className="card-head">
            <h2 id="rev-h">Revenue per day</h2>
            <span className="faint small">Last {p.days} days, excluding canceled and returned orders</span>
          </div>
          {p.orders === 0 ? (
            <div className="chart-empty">No orders in the last {p.days} days. Revenue will show up here as orders come in.</div>
          ) : (
            <AreaChart
              label={`Revenue per day for the last ${p.days} days, ${pounds(p.revenueCents)} in total`}
              format={short}
              points={s.daily.map((d) => ({ label: dayLabel(d.date), value: d.revenueCents, tip: `${dayLabel(d.date)} · ${d.orders} ${d.orders === 1 ? "order" : "orders"}` }))}
            />
          )}
          <details className="data">
            <summary>View as a table</summary>
            <div className="t-wrap">
              <table className="t">
                <thead><tr><th>Day</th><th className="right">Orders</th><th className="right">Revenue</th></tr></thead>
                <tbody>
                  {[...s.daily].reverse().map((d) => (
                    <tr key={d.date}><td>{dayLabel(d.date)}</td><td className="right num">{d.orders}</td><td className="right num">{pounds(d.revenueCents)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section className="card" aria-labelledby="st-h">
          <div className="card-head"><h2 id="st-h">Orders by status</h2><Link href="/admin/orders">All orders</Link></div>
          {total === 0 ? (
            <div className="chart-empty">No orders yet.</div>
          ) : (
            <>
              <div className="stack-bar" role="img" aria-label="Share of orders by status">
                {STATUSES.filter((st) => s.statusCounts[st]).map((st) => (
                  <span key={st} className={`bg-${st}`} style={{ flex: s.statusCounts[st] }} title={`${STATUS_LABEL[st]}: ${s.statusCounts[st]}`} />
                ))}
              </div>
              <ul className="legend">
                {STATUSES.map((st) => (
                  <li key={st}>
                    <Link href={`/admin/orders?status=${st}`}>
                      <span className={`dot ${st}`} />
                      {STATUS_LABEL[st]}
                      <span className="n">{s.statusCounts[st] ?? 0}</span>
                      <span className="pct">{Math.round(((s.statusCounts[st] ?? 0) / total) * 100)}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <section className="card" aria-labelledby="ro-h">
          <div className="card-head"><h2 id="ro-h">Recent orders</h2><Link href="/admin/orders">View all</Link></div>
          {s.recentOrders.length === 0 ? (
            <div className="empty"><b>No orders yet</b>New orders will appear here.</div>
          ) : (
            <div className="t-wrap">
              <table className="t stack-m">
                <thead><tr><th>Order</th><th>Customer</th><th>When</th><th>Status</th><th className="right">Total</th></tr></thead>
                <tbody>
                  {s.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td data-label="Order"><Link className="link-strong" href={`/admin/orders/${o.id}`}>{o.orderNumber}</Link></td>
                      <td data-label="Customer">{o.customerName}</td>
                      <td data-label="When" className="muted">{ago(o.createdAt)}</td>
                      <td data-label="Status"><span className={`pill ${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                      <td data-label="Total" className="right num">{pounds(o.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="na-h">
          <div className="card-head"><h2 id="na-h">Needs your attention</h2></div>
          <ul className="todo">
            <li><Link href="/admin/orders?status=pending"><span className={`badge${s.pending ? "" : " ok"}`}>{s.pending}</span>Orders waiting to be confirmed<small>{s.pending ? "Open" : "Done"}</small></Link></li>
            <li><Link href="/admin/products"><span className={`badge${soldOut ? "" : " ok"}`}>{soldOut}</span>Sizes sold out<small>{soldOut ? "Restock" : "Fine"}</small></Link></li>
            <li><Link href="/admin/people"><span className={`badge${s.recentMessages ? "" : " ok"}`}>{s.recentMessages}</span>Messages in the last 7 days<small>{s.recentMessages ? "Read" : "None"}</small></Link></li>
          </ul>
          <p className="faint small" style={{ margin: "14px 0 0" }}>{s.customers} customers · {s.subscribers} newsletter subscribers · {s.active} of {s.products} products live</p>
        </section>
      </div>

      <div className="grid-2e">
        <section className="card" aria-labelledby="tp-h">
          <div className="card-head"><h2 id="tp-h">Best sellers</h2><span className="faint small">Last {p.days} days, by units</span></div>
          {s.topProducts.length === 0 ? (
            <div className="empty"><b>No sales in this period</b>Your best sellers will show here.</div>
          ) : (
            <ul className="list">
              {s.topProducts.map((t) => (
                <li key={t.name}>
                  {t.imageUrl && <img src={t.imageUrl} alt="" />}
                  <div className="grow">
                    <b>{t.name}</b>
                    <span>{t.units} sold · {pounds(t.revenueCents)}</span>
                    <div className="bar-track" aria-hidden="true"><i style={{ width: `${(t.units / topUnits) * 100}%` }} /></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="ls-h">
          <div className="card-head"><h2 id="ls-h">Low stock</h2><span className="faint small">{s.lowStockAt} or fewer left</span></div>
          {s.lowStock.length === 0 ? (
            <div className="empty"><b>Stock looks healthy</b>Nothing is running low.</div>
          ) : (
            <ul className="list">
              {lowByProduct.map((p) => (
                <li key={p.productId}>
                  <div className="grow">
                    <b>{p.name}</b>
                    <span className="flex" style={{ gap: 6, marginTop: 6 }}>
                      {p.sizes.map((x) => (
                        <span key={x.size} className={`size-chip ${x.stock <= 0 ? "out" : "low"}`}>{x.size} · {x.stock <= 0 ? "sold out" : `${x.stock} left`}</span>
                      ))}
                    </span>
                  </div>
                  <Link className="btn-a ghost sm" href={`/admin/products/${p.productId}`}>Restock</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
