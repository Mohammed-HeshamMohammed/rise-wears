import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description: "Return any RISE item within 14 days of delivery. How exchanges, refunds on cash-on-delivery orders and faulty items work.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <LegalPage
      path="/returns"
      title="Returns & Refunds"
      summary="Changed your mind, or something is not right? Here is how we put it right."
      sections={[
        {
          id: "window",
          title: "14-day returns",
          body: <p>You can return an item within <strong>14 days of receiving it</strong>. You do not need to give a reason. This sits alongside your rights under Egyptian consumer protection law.</p>,
        },
        {
          id: "condition",
          title: "What we can accept",
          body: (
            <>
              <p>To be returned, an item should be:</p>
              <ul>
                <li>unworn, unwashed and not altered;</li>
                <li>in its original condition with the RISE logo and any tags attached;</li>
                <li>sent back with your order number.</li>
              </ul>
              <p>We cannot accept items that have been worn, washed, damaged by use or altered. For hygiene, we may refuse items that show signs of wear.</p>
            </>
          ),
        },
        {
          id: "how",
          title: "How to return something",
          body: (
            <ol>
              <li>Email <a href="mailto:inquiries@rise-wear.store">inquiries@rise-wear.store</a> or use the <Link href="/contact">contact form</Link> within 14 days of delivery. Include your order number and the item you are returning.</li>
              <li>We reply with the next step and arrange a pickup or a drop-off point.</li>
              <li>Pack the item with its tags and hand it to the courier.</li>
              <li>When it reaches us, we check it and confirm your refund or exchange.</li>
            </ol>
          ),
        },
        {
          id: "exchange",
          title: "Size exchanges",
          body: <p>Wrong size? Contact us within <strong>7 days</strong> of receiving your order and we will arrange an exchange for another size, if it is in stock. If your size is not available, we refund you instead.</p>,
        },
        {
          id: "refunds",
          title: "Refunds",
          body: (
            <>
              <p>Because orders are paid in cash on delivery, we refund you by <strong>bank transfer or mobile wallet</strong>. Tell us which you prefer when you contact us. Refunds are made within <strong>7 business days</strong> after we receive and check your return.</p>
              <p>You get back what you paid for the item. The original delivery fee is not refunded unless the item was faulty or the wrong one. Return shipping is at your cost for a change of mind, and free if we sent the wrong item or it was faulty.</p>
            </>
          ),
        },
        {
          id: "offers",
          title: "Returns and offers",
          body: <p>If you bought three items with the "buy 2, get 50% off the 3rd" offer and return one, the discount is recalculated for the items you keep, and the refund is the difference. If you used a promo code, we refund the discounted price you paid.</p>,
        },
        {
          id: "faulty",
          title: "Faulty or wrong items",
          body: <p>If your item arrives damaged, has a manufacturing fault or is not what you ordered, tell us as soon as you can, ideally the same day, with a photo. We will replace it or refund you in full, including delivery, and cover the return shipping.</p>,
        },
        {
          id: "cancel",
          title: "Cancelling before it ships",
          body: <p>You can cancel a pending order from your account at any time. If it is already confirmed, email us and we will cancel it if it has not shipped. See our <Link href="/terms">Terms of Service</Link>.</p>,
        },
      ]}
    />
  );
}
