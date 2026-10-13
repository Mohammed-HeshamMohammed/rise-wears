"use client";

import { useState } from "react";
import { Notice, Page, adminApi, useAdminData, useNotice } from "../util";

interface Ann { id: number; text: string; link: string; active: boolean; sortOrder: number }

export default function AnnouncementsPage() {
  const { data, reload } = useAdminData<Ann[]>("/admin/announcements");
  const { msg, run } = useNotice();
  const [draft, setDraft] = useState({ text: "", link: "" });

  const save = (a: Ann, patch: Partial<Ann>) => run(async () => { await adminApi.put(`/admin/announcements/${a.id}`, { ...a, ...patch }); await reload(); });

  return (
    <Page title="Announcement bar" sub="The scrolling strip at the very top of every page. Switch it off to hide it.">
      <Notice msg={msg} />
      <div className="card">
        <h2>Messages</h2>
        {data?.length === 0 && <p className="sub">No messages. The bar is hidden.</p>}
        {data?.map((a) => (
          <div key={a.id} className="row c3" style={{ gridTemplateColumns: "2fr 1.2fr auto auto", alignItems: "center", marginBottom: 10 }}>
            <input className="plain" defaultValue={a.text} onBlur={(e) => e.target.value !== a.text && save(a, { text: e.target.value })} />
            <input className="plain" defaultValue={a.link} placeholder="Link (optional)" onBlur={(e) => e.target.value !== a.link && save(a, { link: e.target.value })} />
            <button className={`pill ${a.active ? "on" : "off"}`} style={{ border: 0, cursor: "pointer" }} onClick={() => save(a, { active: !a.active })}>{a.active ? "Showing" : "Hidden"}</button>
            <button className="btn-a danger sm" onClick={() => confirm("Delete this message?") && run(async () => { await adminApi.del(`/admin/announcements/${a.id}`); await reload(); }, "Deleted.")}>Delete</button>
          </div>
        ))}
      </div>
      <form className="card" onSubmit={(e) => { e.preventDefault(); run(async () => { await adminApi.post("/admin/announcements", { ...draft, active: true, sortOrder: data?.length ?? 0 }); setDraft({ text: "", link: "" }); await reload(); }, "Added."); }}>
        <h2>Add a message</h2>
        <div className="row c2">
          <div className="f"><label>Text</label><input type="text" required maxLength={200} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="BUY 2 GET 50% OFF THE 3RD!" /></div>
          <div className="f"><label>Link (optional)</label><input type="text" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} placeholder="/shop" /></div>
        </div>
        <button className="btn-a">Add message</button>
      </form>
    </Page>
  );
}
