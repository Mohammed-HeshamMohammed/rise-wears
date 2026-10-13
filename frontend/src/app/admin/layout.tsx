import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminGate from "./AdminGate";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="adm">
      <AdminGate>{children}</AdminGate>
    </div>
  );
}
