import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contactMessage, newOrderAlert, newsletterWelcome, orderConfirmation, orderStatusUpdate, type MailOrder } from "../src/lib/mail/templates.js";

const order: MailOrder = {
  orderNumber: "RISE-1001", status: "shipped", customerName: "Mona Ali", email: "mona@example.com", mobile: "01000000000",
  governorate: "Cairo", city: "Maadi", address: "5 Road 9", apartment: "Apt 4", notes: "Call before arriving", hasAccount: true,
  promoCode: null, subtotalCents: 399997, discountCents: 60000, shippingCents: 10000, totalCents: 349997,
  items: [
    { name: "Rise Black Sweatpants", color: "Black", size: "M", quantity: 2, unitPriceCents: 139999, imageUrl: "/images/products/blackpants/1.jpg" },
    { name: "Rise Black Hoodie", color: "Black", size: "L", quantity: 1, unitPriceCents: 119999, imageUrl: "/images/products/blackhoodie/1.jpg" },
  ],
};

const dir = join(process.cwd(), ".mail-preview");
mkdirSync(dir, { recursive: true });
const mails = {
  "order-confirmation": orderConfirmation(order),
  "new-order-alert": newOrderAlert(order),
  "status-shipped": orderStatusUpdate(order)!,
  "contact-message": contactMessage({ name: "Sara", email: "sara@example.com", subject: "Sizing", message: "Is the hoodie true to size?" }),
  "newsletter-welcome": newsletterWelcome("fan@example.com"),
};
for (const [name, mail] of Object.entries(mails)) writeFileSync(join(dir, `${name}.html`), mail.html);
console.log(`Wrote ${Object.keys(mails).length} previews to ${dir}`);
