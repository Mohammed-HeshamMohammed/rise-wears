export type HeroStyle = "classic" | "split" | "edge";

export interface Hero {
  style: HeroStyle;
  title: string;
  slogan: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
  mobileImageUrl: string;
  dim: number;
}

export const HERO_STYLES: { id: HeroStyle; name: string; text: string }[] = [
  { id: "classic", name: "Classic", text: "Full-screen photo with the title centered. The current look." },
  { id: "edge", name: "Editorial", text: "Full-screen photo with the text in the bottom-left corner, like a magazine cover." },
  { id: "split", name: "Split", text: "Photo on one side, text on a clean light panel on the other." },
];

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
