import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/format";

// Search engines and AI assistants are explicitly welcome on the public catalogue;
// private areas (account, checkout, admin, API) are off limits to everyone.
const PRIVATE = ["/admin", "/account", "/cart", "/checkout", "/login", "/signup", "/api/"];

const AI_CRAWLERS = [
  "GPTBot", // OpenAI training / ChatGPT
  "OAI-SearchBot", // ChatGPT search
  "ChatGPT-User", // ChatGPT browsing on a user's behalf
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended", // Gemini / Vertex AI
  "Applebot-Extended",
  "Bingbot",
  "Googlebot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
