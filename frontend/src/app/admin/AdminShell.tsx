"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Orders"],
  ["/admin/products", "Products"],
  ["/admin/categories", "Categories"],
  ["/admin/deals", "Deals & promo codes"],
  ["/admin/announcements", "Announcement bar"],
  ["/admin/shipping", "Shipping rates"],
  ["/admin/people", "Customers & inbox"],
] as const;

export default function AdminShell({ who, onLogout, banner, children }: { who: string; onLogout: () => void; banner?: ReactNode; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="adm-layout">
      <aside className="adm-side">
        <div className="brand">
          RISE<small>ADMIN DASHBOARD</small>
        </div>
        <nav>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className={path === href || (href !== "/admin" && path.startsWith(href)) ? "on" : ""}>
              {label}
            </Link>
          ))}
          <Link href="/" target="_blank">
            View store ↗
          </Link>
        </nav>
        <div className="foot">
          {who}
          <br />
          <button className="btn-a ghost sm" onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="adm-main">
        {banner}
        {children}
      </main>
    </div>
  );
}
