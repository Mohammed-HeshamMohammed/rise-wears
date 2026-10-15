import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import IntroOverlay from "@/components/IntroOverlay";
import JsonLd from "@/components/JsonLd";
import Providers from "@/components/Providers";
import { SITE_URL } from "@/lib/format";
import "./intro.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "RISE | Rise Above", template: "%s | RISE" },
  description: "Premium athletic apparel designed for those who refuse to settle. Rise Above.",
  applicationName: "RISE",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "RISE",
    locale: "en_EG",
    title: "RISE | Rise Above",
    description: "Premium athletic apparel designed for those who refuse to settle. Rise Above.",
    images: [{ url: "/images/logo.png" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
  },
  icons: { icon: "/images/logo.png", apple: "/images/logo.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#111111" };

const organization = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "RISE",
      alternateName: "RISE Apparel",
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo.png`,
      slogan: "Rise Above.",
      email: "inquiries@rise-wear.store",
      areaServed: "EG",
      contactPoint: { "@type": "ContactPoint", email: "inquiries@rise-wear.store", contactType: "customer service", availableLanguage: "English" },
    },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "RISE", inLanguage: "en", publisher: { "@id": `${SITE_URL}/#organization` } },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
        <JsonLd data={organization} />
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(sessionStorage.getItem(\"rise-intro\")||location.pathname!==\"/\")document.documentElement.classList.add(\"no-intro\")}catch(e){}",
          }}
        />
      </head>
      <body>
        <IntroOverlay />
        <Providers>{children}</Providers>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
