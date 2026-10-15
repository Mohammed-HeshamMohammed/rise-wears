import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal data RISE collects, why, who it is shared with, how long it is kept, and your rights under Egypt's Personal Data Protection Law.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      path="/privacy"
      title="Privacy Policy"
      summary="What we collect, why we need it, and the control you have over it."
      sections={[
        {
          id: "who",
          title: "Who we are",
          body: <p>RISE Apparel is responsible for the personal data described here. You can reach us at <a href="mailto:inquiries@rise-wear.store">inquiries@rise-wear.store</a>. We handle personal data in line with Egypt's Personal Data Protection Law (Law No. 151 of 2020).</p>,
        },
        {
          id: "collect",
          title: "What we collect",
          body: (
            <div className="legal-table-wrap">
              <table className="legal-table">
                <thead>
                  <tr><th>When</th><th>What</th></tr>
                </thead>
                <tbody>
                  <tr><td>You place an order</td><td>Name, email, mobile number, delivery address, delivery notes, the items you buy and any promo code used.</td></tr>
                  <tr><td>You create an account</td><td>Name, email and a login. If you use Google, we receive your name and email from Google. Passwords are handled by our login provider and are never visible to us.</td></tr>
                  <tr><td>You contact us</td><td>Your name, email and message.</td></tr>
                  <tr><td>You join the newsletter</td><td>Your email address.</td></tr>
                  <tr><td>You browse</td><td>Technical data such as device, browser and pages visited, if analytics is switched on (see Cookies below).</td></tr>
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: "use",
          title: "How we use it",
          body: (
            <ul>
              <li>To confirm, prepare, deliver and support your orders, including calling you to confirm delivery.</li>
              <li>To run your account and show your order history.</li>
              <li>To answer your messages.</li>
              <li>To send order updates by email (confirmed, shipped, delivered and so on).</li>
              <li>To send news and offers, only if you subscribed. You can unsubscribe at any time.</li>
              <li>To prevent fraud and keep the store secure.</li>
              <li>To keep the records the law requires, such as accounting records.</li>
            </ul>
          ),
        },
        {
          id: "basis",
          title: "Why we may do this",
          body: <p>We use your data because you asked us to buy something from you, because you agreed (for example to the newsletter), because the law requires it, or because it is needed to run and protect our business in ways you would reasonably expect. You can withdraw consent whenever you like.</p>,
        },
        {
          id: "share",
          title: "Who we share it with",
          body: (
            <>
              <p>We do not sell your data. We share it only with the services that help us run the store:</p>
              <ul>
                <li><strong>Delivery couriers</strong>, who need your name, phone number and address.</li>
                <li><strong>Hosting and database providers</strong> that store the site and its data.</li>
                <li><strong>Google Firebase</strong>, which handles sign-in (email and Google login).</li>
                <li><strong>Our email provider</strong>, which sends order emails and replies.</li>
                <li><strong>Authorities</strong>, where the law requires it.</li>
              </ul>
              <p>Some of these providers run servers outside Egypt. We only use providers that protect data to a reasonable standard.</p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies and similar storage",
          body: (
            <>
              <p>We keep this to the minimum the site needs:</p>
              <ul>
                <li>Your shopping bag is saved in your browser so it is still there when you come back.</li>
                <li>A small note in your browser remembers that you saw the intro animation during this visit.</li>
                <li>Signing in stores a login session in your browser.</li>
              </ul>
              <p>If we switch on Google Analytics, it uses cookies to count visits and see which pages are popular. You can block cookies in your browser settings; the store still works, though some features such as staying signed in may not.</p>
            </>
          ),
        },
        {
          id: "keep",
          title: "How long we keep it",
          body: <p>We keep order records for as long as the law requires us to keep accounting records, and account data until you ask us to delete it. Contact-form messages are kept for as long as they are needed to deal with your question. Newsletter emails stay on the list until you unsubscribe.</p>,
        },
        {
          id: "rights",
          title: "Your rights",
          body: (
            <>
              <p>You can ask us to:</p>
              <ul>
                <li>tell you what data we hold about you and give you a copy;</li>
                <li>correct anything that is wrong or out of date;</li>
                <li>delete your data or your account, unless we must keep it by law;</li>
                <li>stop using your data for marketing or restrict how we use it.</li>
              </ul>
              <p>Email <a href="mailto:inquiries@rise-wear.store">inquiries@rise-wear.store</a> from the address on your account and we will respond within a reasonable time. If you are not satisfied with our answer, you can complain to Egypt's Personal Data Protection Centre.</p>
            </>
          ),
        },
        {
          id: "security",
          title: "Keeping it safe",
          body: <p>The site uses encrypted connections, and sensitive admin data is encrypted. Admin access needs a second verification step. No online system is perfectly secure, so please use a strong, unique password for your account.</p>,
        },
        {
          id: "children",
          title: "Children",
          body: <p>The store is meant for adults. If you are under 18, please ask a parent or guardian to place orders for you.</p>,
        },
        {
          id: "changes",
          title: "Changes",
          body: <p>If we change this policy, we will update the date at the top. For significant changes we will say so on the site. See also our <Link href="/terms">Terms of Service</Link>.</p>,
        },
      ]}
    />
  );
}
