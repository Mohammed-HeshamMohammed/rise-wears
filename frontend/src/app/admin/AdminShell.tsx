"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

const ICONS: Record<string, string> = {
  dashboard: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  orders: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
  people: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  products: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01",
  categories: "m12 2 10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5",
  deals: "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  hero: "M3 3h18v18H3zM3 15l5-5 4 4 3-3 6 6",
  announce: "m3 11 18-8v18L3 13zM11.6 16.8a3 3 0 1 1-5.8-1.6",
  shipping: "M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  store: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "M18 6 6 18M6 6l12 12",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

export function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

const GROUPS: { label: string; items: [string, string, keyof typeof ICONS][] }[] = [
  { label: "Overview", items: [["/admin", "Dashboard", "dashboard"]] },
  { label: "Sales", items: [["/admin/orders", "Orders", "orders"], ["/admin/people", "Customers & inbox", "people"]] },
  { label: "Catalog", items: [["/admin/products", "Products", "products"], ["/admin/categories", "Categories", "categories"], ["/admin/deals", "Deals & promo codes", "deals"]] },
  { label: "Store", items: [["/admin/hero", "Home page hero", "hero"], ["/admin/announcements", "Announcement bar", "announce"], ["/admin/shipping", "Shipping rates", "shipping"]] },
];

const THEME_KEY = "rise-admin-theme";

export default function AdminShell({ who, onLogout, banner, children }: { who: string; onLogout: () => void; banner?: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.querySelector(".adm");
    if (!root) return;
    if (theme) root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
  }, [theme]);

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    api<{ pending: number }>("/admin/stats?days=7", { admin: true })
      .then((s) => setPending(s.pending))
      .catch(() => {});
  }, [path]);

  const isDark = () => (theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  const toggleTheme = () => {
    const next = isDark() ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  };

  return (
    <div className="adm-layout">
      <div className="adm-top">
        <button className="icon-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
        <span className="brand">RISE</span>
      </div>
      <div className={`adm-scrim${open ? " open" : ""}`} onClick={() => setOpen(false)} />

      <aside className={`adm-side${open ? " open" : ""}`} aria-label="Admin navigation">
        <div className="brand">
          RISE<small>ADMIN DASHBOARD</small>
        </div>
        <nav>
          {GROUPS.map((g) => (
            <div className="group" key={g.label}>
              <span>{g.label}</span>
              {g.items.map(([href, label, icon]) => (
                <Link key={href} href={href} className={path === href || (href !== "/admin" && path.startsWith(href)) ? "on" : ""} aria-current={path === href ? "page" : undefined}>
                  <Icon name={icon} />
                  {label}
                  {href === "/admin/orders" && pending > 0 && <span className="count" aria-label={`${pending} pending`}>{pending}</span>}
                </Link>
              ))}
            </div>
          ))}
          <div className="group">
            <Link href="/" target="_blank">
              <Icon name="store" />
              View store
            </Link>
          </div>
        </nav>
        <div className="foot">
          <span>
            Signed in as
            <br />
            <b>{who}</b>
          </span>
          <div className="row-btns">
            <button className="side-btn" onClick={toggleTheme}>
              <Icon name={isDark() ? "sun" : "moon"} />
              {isDark() ? "Light" : "Dark"} mode
            </button>
            <button className="side-btn" onClick={onLogout}>
              <Icon name="logout" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="adm-main">
        {banner}
        {children}
      </main>
    </div>
  );
}
