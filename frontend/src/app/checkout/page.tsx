import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import CheckoutView from "./CheckoutView";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <PageShell page="checkout">
      <CheckoutView />
    </PageShell>
  );
}
