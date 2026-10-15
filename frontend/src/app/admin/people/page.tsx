"use client";

import { useState } from "react";
import { Notice, Page, dateTime, useAdminData } from "../util";

type Tab = "customers" | "subscribers" | "messages";

export default function PeoplePage() {
  const [tab, setTab] = useState<Tab>("customers");
  const { data, error } = useAdminData<any[]>(`/admin/${tab}`);

  function exportCsv() {
    const rows = data ?? [];
    const text = "email,subscribed_at\n" + rows.map((r) => `${r.email},${new Date(r.createdAt).toISOString()}`).join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "rise-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page title="Customers & inbox" sub="Registered customers, newsletter subscribers and contact-form messages.">
      <Notice msg={error ? { kind: "error", text: error } : null} />
      <div className="tabs" role="group" aria-label="Choose a list">
        {(["customers", "subscribers", "messages"] as Tab[]).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
        {tab === "subscribers" && <button className="btn-a ghost sm" onClick={exportCsv}>Export CSV</button>}
      </div>
      <div className="card flush t-wrap">
        {tab === "customers" && (
          <table className="t"><thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Orders</th><th>Joined</th></tr></thead>
            <tbody>{data?.map((c) => <tr key={c.id}><td>{c.name || "—"}</td><td>{c.email}</td><td>{c.mobile || "—"}</td><td>{c.orderCount}</td><td>{dateTime(c.createdAt)}</td></tr>)}</tbody></table>
        )}
        {tab === "subscribers" && (
          <table className="t"><thead><tr><th>Email</th><th>Subscribed</th></tr></thead>
            <tbody>{data?.map((s) => <tr key={s.id}><td>{s.email}</td><td>{dateTime(s.createdAt)}</td></tr>)}</tbody></table>
        )}
        {tab === "messages" && (
          <table className="t"><thead><tr><th>From</th><th>Subject</th><th>Message</th><th>Date</th></tr></thead>
            <tbody>{data?.map((m) => <tr key={m.id}><td><b>{m.name}</b><br /><a href={`mailto:${m.email}`}>{m.email}</a></td><td>{m.subject || "—"}</td><td style={{ maxWidth: 420, whiteSpace: "pre-wrap" }}>{m.message}</td><td>{dateTime(m.createdAt)}</td></tr>)}</tbody></table>
        )}
        {data?.length === 0 && <div className="empty"><b>Nothing here yet</b>New entries will show up in this list.</div>}
      </div>
    </Page>
  );
}
