"use client";

import Link from "next/link";
import { Notice, Page, egp, useAdminData } from "./util";

interface Stats {
  orders: number;
  pending: number;
  revenueCents: number;
  products: number;
  active: number;
  customers: number;
  subscribers: number;
}

export default function AdminDashboard() {
  const { data, error } = useAdminData<Stats>("/admin/stats");
  const tiles: [string, string | number][] = data
    ? [
        ["Orders", data.orders],
        ["Pending orders", data.pending],
        ["Revenue (excl. canceled)", `EGP ${egp(data.revenueCents)}`],
        ["Live products", `${data.active} / ${data.products}`],
        ["Customers", data.customers],
        ["Newsletter subscribers", data.subscribers],
      ]
    : [];
  return (
    <Page title="Dashboard" sub="What's happening in the store.">
      <Notice msg={error ? { kind: "error", text: error } : null} />
      <div className="stats">
        {tiles.map(([label, value]) => (
          <div className="stat" key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Quick actions</h2>
        <div className="flex">
          <Link className="btn-a" href="/admin/orders?status=pending">Review pending orders</Link>
          <Link className="btn-a ghost" href="/admin/products/new">Add a product</Link>
          <Link className="btn-a ghost" href="/admin/announcements">Edit announcement bar</Link>
          <Link className="btn-a ghost" href="/admin/deals">Manage deals</Link>
        </div>
      </div>
    </Page>
  );
}
