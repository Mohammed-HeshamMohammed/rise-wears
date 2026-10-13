import type { Metadata } from "next";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import AccountGate from "./AccountGate";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell page="account">
      <AccountGate>{children}</AccountGate>
    </PageShell>
  );
}
