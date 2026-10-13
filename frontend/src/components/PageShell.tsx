import type { ReactNode } from "react";
import { getAnnouncements } from "@/lib/api";
import Footer from "./Footer";
import Header from "./Header";

import "@/styles/generated/home.css";
import "@/styles/generated/shop.css";
import "@/styles/generated/product.css";
import "@/styles/generated/cart.css";
import "@/styles/generated/checkout.css";
import "@/styles/generated/about.css";
import "@/styles/generated/contact.css";
import "@/styles/generated/account.css";

export type PageName = "home" | "shop" | "product" | "cart" | "checkout" | "about" | "contact" | "account";

// Scopes the page's CSS under `.pg-<name>` (see scripts/build-css.mjs) so it renders like the original per-page stylesheets.
export default async function PageShell({ page, children }: { page: PageName; children: ReactNode }) {
  const announcements = await getAnnouncements();
  return (
    <div className={`pg-${page}`}>
      <Header announcements={announcements} />
      {children}
      <Footer />
    </div>
  );
}
