"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import type { Announcement } from "@/lib/types";

function Ticker({ items }: { items: Announcement[] }) {
  // Same markup as the live store: two identical groups so the CSS marquee loops seamlessly.
  const group = [...items, ...items].map((a, i) =>
    a.link ? (
      <span key={i}>
        <a href={a.link}>{a.text}</a>
      </span>
    ) : (
      <span key={i}>{a.text}</span>
    ),
  );
  return (
    <div className="promo-ticker" aria-label="Promotion">
      <div className="promo-ticker-track">
        <div className="promo-ticker-group">{group}</div>
        <div className="promo-ticker-group" aria-hidden="true">
          {group}
        </div>
      </div>
    </div>
  );
}

export default function Header({ announcements }: { announcements: Announcement[] }) {
  const { count } = useCart();
  return (
    <div id="header">
      <header className="site-header">
        {announcements.length > 0 && <Ticker items={announcements} />}
        <div className="container navbar">
          <Link href="/" className="logo">
            <img src="/images/logo.png" alt="Rise Logo" />
          </Link>
          <nav>
            <ul className="nav-links">
              <li>
                <Link href="/shop">Shop</Link>
              </li>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </nav>
          <div className="nav-icons">
            <Link href="/account" aria-label="My account" className="account-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
            </Link>
            <Link href="/cart" aria-label="Shopping cart" className="cart-link">
              <svg className="cart-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" />
                <circle cx="10" cy="20" r="1.2" />
                <circle cx="18" cy="20" r="1.2" />
              </svg>
              <span id="cart-count">{count}</span>
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
