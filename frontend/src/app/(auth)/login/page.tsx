import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import AuthForm from "../AuthForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: true }, alternates: { canonical: "/login" } };

export default function LoginPage() {
  return (
    <PageShell page="account">
      <AuthForm mode="login" />
    </PageShell>
  );
}
