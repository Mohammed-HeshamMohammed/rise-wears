"use client";

import { useEffect, useState, type ReactNode } from "react";
import { apiOrigin } from "@/lib/api";
import AdminGate from "./AdminGate";
import DemoGate from "./DemoGate";

// Chooses between the real, secured dashboard and the offline demo: if the backend answers, the real login is used.
export default function AdminRoot({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"probing" | "real" | "demo">("probing");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    fetch(`${apiOrigin}/api/health`, { signal: controller.signal })
      .then((r) => setMode(r.ok ? "real" : "demo"))
      .catch(() => setMode("demo"))
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  if (mode === "probing") return <div className="gate"><p>Loading…</p></div>;
  return mode === "real" ? <AdminGate>{children}</AdminGate> : <DemoGate>{children}</DemoGate>;
}
