"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Address {
  id: number;
  label: string;
  governorate: string;
  city: string;
  address: string;
  apartment: string;
  mobile: string;
  isDefault: boolean;
}

const GOVERNORATES = [
  "Cairo", "Alexandria", "Port Said", "Suez", "Giza", "Damietta", "Dakahlia", "Sharkia", "Qalyubia", "Kafr el-Sheikh",
  "Gharbia", "Menoufia", "El-Beheira", "Ismailia", "Bani Suef", "Fayoum", "Minya", "Asyut", "Sohag", "Qena", "Luxor",
  "Aswan", "The Red Sea", "The New Valley", "Matrouh", "North Sinai", "South Sinai",
];

const blank = { label: "Home", governorate: "Cairo", city: "", address: "", apartment: "", mobile: "", isDefault: false };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: "", mobile: "" });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<(typeof blank & { id?: number }) | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const load = async () => {
    const [me, addrs] = await Promise.all([api("/me", { auth: true }), api<Address[]>("/me/addresses", { auth: true })]);
    setProfile({ name: me.name || "", mobile: me.mobile || "" });
    setAddresses(addrs);
  };

  useEffect(() => {
    if (user) load().catch((e) => setMsg({ kind: "error", text: e.message }));
  }, [user]);

  const wrap = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "success", text: ok });
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    }
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    return wrap(() => api("/me", { method: "PUT", auth: true, body: profile }), "Profile saved.");
  };

  const saveAddress = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { id, ...body } = editing;
    return wrap(async () => {
      await api(id ? `/me/addresses/${id}` : "/me/addresses", { method: id ? "PUT" : "POST", auth: true, body });
      setEditing(null);
      await load();
    }, "Address saved.");
  };

  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setEditing((a) => (a ? { ...a, [k]: e.target.value } : a));

  return (
    <>
      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
      <div className="acct-grid">
        <div>
          <form className="acct-card" onSubmit={saveProfile}>
            <h2>Your details</h2>
            <div className="field">
              <label>Email</label>
              <input value={user?.email ?? ""} disabled />
            </div>
            <div className="field">
              <label htmlFor="pname">Full name</label>
              <input id="pname" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="pmobile">Mobile number</label>
              <input id="pmobile" value={profile.mobile} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} autoComplete="tel" />
            </div>
            <button className="acct-btn">Save changes</button>
          </form>
        </div>

        <div>
          <div className="acct-card">
            <h2>Addresses</h2>
            {addresses.length === 0 && !editing && <p style={{ color: "#666", fontSize: 14, marginBottom: 14 }}>No saved addresses yet. Saved addresses fill in checkout for you.</p>}
            {addresses.map((a) => (
              <div className="addr" key={a.id}>
                <strong>
                  {a.label}
                  {a.isDefault && <span className="tag">DEFAULT</span>}
                </strong>
                {a.address}
                {a.apartment ? `, ${a.apartment}` : ""}
                <br />
                {a.city}, {a.governorate}
                {a.mobile ? ` · ${a.mobile}` : ""}
                <div className="row-actions">
                  <button className="acct-btn ghost small" onClick={() => setEditing(a)}>
                    Edit
                  </button>
                  <button className="acct-btn danger small" onClick={() => wrap(async () => { await api(`/me/addresses/${a.id}`, { method: "DELETE", auth: true }); await load(); }, "Address removed.")}>
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {editing ? (
              <form onSubmit={saveAddress} style={{ marginTop: 18 }}>
                <div className="acct-two">
                  <div className="field">
                    <label>Label</label>
                    <input value={editing.label} onChange={set("label")} required />
                  </div>
                  <div className="field">
                    <label>Governorate</label>
                    <select value={editing.governorate} onChange={set("governorate")}>
                      {GOVERNORATES.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>City</label>
                  <input value={editing.city} onChange={set("city")} required />
                </div>
                <div className="field">
                  <label>Address</label>
                  <textarea rows={3} value={editing.address} onChange={set("address")} required />
                </div>
                <div className="acct-two">
                  <div className="field">
                    <label>Apartment / Building</label>
                    <input value={editing.apartment} onChange={set("apartment")} />
                  </div>
                  <div className="field">
                    <label>Mobile</label>
                    <input value={editing.mobile} onChange={set("mobile")} />
                  </div>
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginBottom: 16 }}>
                  <input type="checkbox" checked={editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} />
                  Use as my default address
                </label>
                <button className="acct-btn" style={{ marginRight: 8 }}>
                  Save address
                </button>
                <button type="button" className="acct-btn ghost" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <button className="acct-btn ghost small" onClick={() => setEditing({ ...blank })}>
                + Add address
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
