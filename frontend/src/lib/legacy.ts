import { getProducts } from "./api";

export async function legacyProductRedirect(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const product = id ? (await getProducts()).find((p) => p.legacyId === id || p.slug === id) : null;
  const dest = new URL(product ? `/products/${product.slug}` : "/shop", url.origin);
  return Response.redirect(dest, 301);
}
