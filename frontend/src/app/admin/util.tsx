"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

export const egp = (cents: number) => (cents / 100).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const toCents = (v: string | number) => Math.round(Number(v) * 100);
export const fromCents = (c: number | null | undefined) => (c == null ? "" : String(c / 100));
export const dateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export function useAdminData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path, { admin: true }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load.");
    }
  }, [path]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, reload, setData };
}

export function useNotice() {
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const run = useCallback(async (fn: () => Promise<unknown>, ok = "Saved.") => {
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "ok", text: ok });
      return true;
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
      return false;
    }
  }, []);
  return { msg, run, setMsg };
}

export function Notice({ msg }: { msg: { kind: "ok" | "error"; text: string } | null }) {
  return msg ? <div className={`msg ${msg.kind}`}>{msg.text}</div> : null;
}

export function Page({ title, sub, action, children }: { title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="flex between" style={{ marginBottom: 6 }}>
        <div>
          <h1>{title}</h1>
          {sub && <p className="sub" style={{ marginBottom: 0 }}>{sub}</p>}
        </div>
        {action}
      </div>
      <div style={{ marginTop: 22 }}>{children}</div>
    </>
  );
}

export const adminApi = {
  post: <T,>(path: string, body: unknown) => api<T>(path, { admin: true, method: "POST", body }),
  put: <T,>(path: string, body: unknown) => api<T>(path, { admin: true, method: "PUT", body }),
  patch: <T,>(path: string, body: unknown) => api<T>(path, { admin: true, method: "PATCH", body }),
  del: (path: string) => api(path, { admin: true, method: "DELETE" }),
};
