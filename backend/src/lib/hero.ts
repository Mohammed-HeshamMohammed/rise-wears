import { z } from "zod";
import { one } from "../db.js";

export const HERO_STYLES = ["classic", "split", "edge"] as const;

const imageUrl = z.string().max(500).refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "Use an uploaded image or a full web address.");

export const heroSchema = z.object({
  style: z.enum(HERO_STYLES),
  title: z.string().trim().min(1).max(40),
  slogan: z.string().trim().max(60),
  description: z.string().trim().max(200),
  buttonText: z.string().trim().min(1).max(30),
  buttonLink: z.string().trim().max(200).regex(/^(\/|https?:\/\/)/, "The link must start with / or https://"),
  imageUrl,
  mobileImageUrl: imageUrl,
  dim: z.number().int().min(0).max(80),
});

export type Hero = z.infer<typeof heroSchema>;

export const DEFAULT_HERO: Hero = {
  style: "classic",
  title: "RISE",
  slogan: "RISE ABOVE",
  description: "Built for those chasing the next level.",
  buttonText: "SHOP COLLECTION",
  buttonLink: "/shop",
  imageUrl: "/images/hero/hero.webp",
  mobileImageUrl: "/images/hero/hero-mobile.webp",
  dim: 45,
};

export async function getHero(): Promise<Hero> {
  const row = await one<{ value: unknown }>("SELECT value FROM site_settings WHERE key = 'hero'");
  const parsed = heroSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_HERO;
}

export async function saveHero(hero: Hero) {
  await one(
    `INSERT INTO site_settings (key, value) VALUES ('hero', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value RETURNING key`,
    [JSON.stringify(hero)],
  );
}
