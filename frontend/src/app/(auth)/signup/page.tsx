import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import AuthForm from "../AuthForm";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: true }, alternates: { canonical: "/signup" } };

export default function SignupPage() {
  return (
    <PageShell page="account">
      <AuthForm mode="signup" />
    </PageShell>
  );
}
