import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description: "RISE ships to every governorate in Egypt. Delivery takes 2 to 4 business days, with cash on delivery. Delivery fees from 100 EGP.",
  alternates: { canonical: "/shipping" },
};

const ZONES = [
  { fee: "EGP 100", places: "Cairo, Giza" },
  { fee: "EGP 120", places: "Alexandria, Port Said, Qalyubia, Dakahlia, Sharkia, Ismailia, Suez, Gharbia, Menoufia, El-Beheira, Kafr el-Sheikh, Damietta" },
  { fee: "EGP 150", places: "Bani Suef, Fayoum, Minya, Asyut, Sohag, Qena, Luxor, Aswan, The Red Sea, The New Valley, Matrouh, North Sinai, South Sinai" },
];

export default function ShippingPage() {
  return (
    <LegalPage
      path="/shipping"
      title="Shipping & Delivery"
      summary="Where we deliver, what it costs and what to expect from order to doorstep."
      sections={[
        {
          id: "where",
          title: "Where we deliver",
          body: <p>We deliver to every governorate in Egypt. International shipping is coming soon.</p>,
        },
        {
          id: "time",
          title: "How long it takes",
          body: (
            <>
              <p>Delivery takes <strong>2 to 4 business days</strong> after we confirm your order. Business days are Sunday to Thursday, excluding public holidays. Remote governorates can take slightly longer.</p>
              <div className="legal-note">
                <p>We call you to confirm your order before it ships. Keep your phone on and make sure the mobile number on your order is right.</p>
              </div>
            </>
          ),
        },
        {
          id: "fees",
          title: "Delivery fees",
          body: (
            <>
              <p>The delivery fee depends on your governorate. You see the exact amount at checkout before you place your order.</p>
              <div className="legal-table-wrap">
                <table className="legal-table">
                  <thead>
                    <tr><th>Fee</th><th>Governorates</th></tr>
                  </thead>
                  <tbody>
                    {ZONES.map((z) => (
                      <tr key={z.fee}>
                        <td><strong>{z.fee}</strong></td>
                        <td>{z.places}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Fees can change. The fee shown at checkout when you order is the one that applies to your order.</p>
            </>
          ),
        },
        {
          id: "payment",
          title: "Paying on delivery",
          body: <p>You pay the courier in cash when your parcel arrives. The amount is your order total, which already includes the delivery fee. Please try to have the exact amount, as couriers do not always carry change.</p>,
        },
        {
          id: "track",
          title: "Order updates",
          body: <p>We email you when your order is confirmed, shipped and delivered. If you have an account, you can also follow your order under <Link href="/account/orders">My account</Link>. The courier calls you before delivery.</p>,
        },
        {
          id: "missed",
          title: "If you are not there",
          body: <p>If the courier cannot reach you, they will try again. After repeated failed attempts, the order may be returned to us and cancelled. Contact us and we will arrange a new delivery if we can.</p>,
        },
        {
          id: "check",
          title: "When your parcel arrives",
          body: <p>Please check the parcel before you pay. If it is damaged, or the wrong item, tell the courier and contact us the same day at <a href="mailto:inquiries@rise-wear.store">inquiries@rise-wear.store</a> with your order number. We will put it right at no cost to you. See <Link href="/returns">Returns &amp; Refunds</Link>.</p>,
        },
        {
          id: "address",
          title: "Getting the address right",
          body: <p>Include the governorate, city, street, building and apartment number, and any useful landmark. We cannot change an address once the order has shipped, so contact us as early as you can if you spot a mistake.</p>,
        },
      ]}
    />
  );
}
