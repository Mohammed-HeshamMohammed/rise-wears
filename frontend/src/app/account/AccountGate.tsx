"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export default function AccountGate({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [loading, user, router, path]);

  if (loading || !user) return <section className="acct-page"><div className="container"><p>Loading…</p></div></section>;

  const onOrders = path.startsWith("/account/orders");
  return (
    <section className="acct-page">
      <div className="container">
        <div className="acct-head">
          <div>
            <h1>MY ACCOUNT</h1>
            <p>{user.email}</p>
          </div>
          <button className="acct-btn ghost small" onClick={() => signOut().then(() => router.replace("/"))}>
            Log out
          </button>
        </div>
        <nav className="acct-nav">
          <Link href="/account/orders" className={onOrders ? "active" : ""}>
            Orders
          </Link>
          <Link href="/account" className={!onOrders ? "active" : ""}>
            Profile &amp; addresses
          </Link>
        </nav>
        {children}
      </div>
    </section>
  );
}
