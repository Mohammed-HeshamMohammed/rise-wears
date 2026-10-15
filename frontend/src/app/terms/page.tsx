import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for buying from RISE: orders, prices in EGP, cash on delivery, offers, cancellations and your rights as a customer in Egypt.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      path="/terms"
      title="Terms of Service"
      summary="The rules for using rise-wear.store and buying from RISE, in plain language."
      sections={[
        {
          id: "about",
          title: "About these terms",
          body: (
            <>
              <p>These terms apply when you browse rise-wear.store, create an account or place an order. RISE Apparel ("RISE", "we", "us") is the seller. By placing an order or creating an account you agree to them.</p>
              <p>They sit alongside our <Link href="/privacy">Privacy Policy</Link>, <Link href="/shipping">Shipping &amp; Delivery</Link> and <Link href="/returns">Returns &amp; Refunds</Link> policies. Nothing here limits the rights you have under Egyptian consumer protection law (Law No. 181 of 2018).</p>
            </>
          ),
        },
        {
          id: "orders",
          title: "Orders and acceptance",
          body: (
            <>
              <p>When you place an order we send a confirmation email. That email shows we received your request and is not yet our acceptance. We accept your order when we confirm it, usually by phone or email, and the contract is formed at that point.</p>
              <p>Please check your name, mobile number and address before you order. We call the number you give us to confirm delivery, so a wrong number can delay or cancel your order.</p>
            </>
          ),
        },
        {
          id: "prices",
          title: "Prices and payment",
          body: (
            <>
              <p>All prices are in Egyptian pounds (EGP). The price you see at checkout, plus the delivery fee for your governorate, is the amount you pay.</p>
              <p><strong>Payment is cash on delivery.</strong> You pay the courier when your parcel arrives. Please have the exact amount ready when you can.</p>
              <p>We work hard to keep prices accurate. If a price is clearly wrong, for example a missing digit, we may cancel the order and tell you before it ships. You will not be charged.</p>
            </>
          ),
        },
        {
          id: "offers",
          title: "Offers and promo codes",
          body: (
            <>
              <p>Our automatic offer ("buy 2, get 50% off the 3rd") applies to the lowest-priced item in each group of three in your bag. It is applied automatically at checkout.</p>
              <p>Promo codes are applied at checkout. A promo code cannot be combined with the automatic offer: when the offer applies, it is used instead of the code. Codes can expire or be switched off, and a discount can never take the total below the delivery fee.</p>
              <p>We may end or change offers at any time. An offer that was active when you placed your order stays valid for that order.</p>
            </>
          ),
        },
        {
          id: "stock",
          title: "Availability",
          body: <p>Stock is limited and shown per size. If an item sells out between your order and our confirmation, we will contact you to offer another size, a different item or a cancellation with nothing to pay.</p>,
        },
        {
          id: "delivery-returns",
          title: "Delivery and returns",
          body: (
            <p>Delivery times, fees and coverage are in <Link href="/shipping">Shipping &amp; Delivery</Link>. How to return or exchange an item, and how refunds work, is in <Link href="/returns">Returns &amp; Refunds</Link>. Both form part of these terms.</p>
          ),
        },
        {
          id: "cancel",
          title: "Cancelling an order",
          body: <p>You can cancel an order yourself from your account while it is still <strong>pending</strong>. After we confirm it, contact us at <a href="mailto:inquiries@rise-wear.store">inquiries@rise-wear.store</a> and we will cancel it if it has not shipped. Once an order is with the courier, our returns policy applies instead.</p>,
        },
        {
          id: "accounts",
          title: "Your account",
          body: <p>Creating an account is optional. You are responsible for keeping your login secure and for activity on your account. Tell us at once if you think someone else has used it. We may suspend an account that is used to commit fraud or to abuse offers.</p>,
        },
        {
          id: "use",
          title: "Using the site",
          body: (
            <>
              <p>Please do not misuse the site. In particular, do not:</p>
              <ul>
                <li>place orders with false details or that you do not intend to accept;</li>
                <li>try to get around prices, stock limits or promo-code rules;</li>
                <li>attempt to access accounts, the admin area or our systems without permission;</li>
                <li>copy or scrape the site in bulk.</li>
              </ul>
            </>
          ),
        },
        {
          id: "ip",
          title: "Our content",
          body: <p>The RISE name, logo, product photography, text and design belong to RISE Apparel or its licensors. You may view and share product pages for personal, non-commercial use, but you may not copy or reuse our content commercially without written permission.</p>,
        },
        {
          id: "liability",
          title: "Liability",
          body: (
            <>
              <p>We make sure products match their description and are of satisfactory quality. Colours can look slightly different on different screens.</p>
              <p>To the extent the law allows, we are not responsible for indirect losses, or for delays caused by events outside our control such as courier disruption, weather or public holidays. Nothing in these terms limits liability that cannot be limited under Egyptian law.</p>
            </>
          ),
        },
        {
          id: "law",
          title: "Governing law",
          body: <p>These terms are governed by the laws of the Arab Republic of Egypt, and the competent Egyptian courts have jurisdiction over any dispute. We would always rather solve a problem with you directly first, so please contact us.</p>,
        },
        {
          id: "changes",
          title: "Changes to these terms",
          body: <p>We may update these terms from time to time. The date at the top shows the latest version. Orders are covered by the terms in force when you placed them.</p>,
        },
        {
          id: "contact",
          title: "Contact",
          body: <p>Questions about these terms? Email <a href="mailto:inquiries@rise-wear.store">inquiries@rise-wear.store</a> or use the <Link href="/contact">contact form</Link>. We reply within 24 to 48 business hours.</p>,
        },
      ]}
    />
  );
}
