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

/**
 * Wraps a page in its own `.pg-<name>` scope (see scripts/build-css.mjs) with the shared header and footer,
 * so each page renders exactly like its stylesheet-per-page original.
 */
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
