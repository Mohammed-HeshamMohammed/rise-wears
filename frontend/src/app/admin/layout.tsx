import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminRoot from "./AdminRoot";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="adm">
      <AdminRoot>{children}</AdminRoot>
    </div>
  );
}
