import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

/** Called by the backend after dashboard changes so the public site updates immediately. */
export async function POST(req: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  const given = req.headers.get("x-revalidate-secret") ?? "";
  if (!expected) return new Response("Not found", { status: 404 });
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Forbidden", { status: 403 });

  revalidatePath("/", "layout");
  for (const p of ["/sitemap.xml", "/llms.txt", "/llms-full.txt", "/feeds/google-merchant.xml"]) revalidatePath(p);
  return Response.json({ ok: true });
}
