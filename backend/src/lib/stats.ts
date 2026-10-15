import { query } from "../db.js";

export const PERIODS = [7, 14, 30, 90] as const;
const LIVE = "o.status NOT IN ('canceled','returned')";
const LOW_STOCK_AT = 3;
const CAIRO_DAY = "(o.created_at AT TIME ZONE 'Africa/Cairo')::date";

// Everything the dashboard home needs, for the last `days` days and the same length period before it.
export async function dashboardStats(days: number) {
  const [totals] = await query(
    `SELECT (SELECT count(*)::int FROM orders) AS orders,
            (SELECT count(*)::int FROM orders WHERE status = 'pending') AS pending,
            (SELECT COALESCE(sum(total_cents), 0)::bigint FROM orders o WHERE ${LIVE}) AS "revenueCents",
            (SELECT count(*)::int FROM products) AS products,
            (SELECT count(*) FILTER (WHERE active)::int FROM products) AS active,
            (SELECT count(*)::int FROM users WHERE role = 'customer') AS customers,
            (SELECT count(*)::int FROM newsletter_subscribers) AS subscribers,
            (SELECT count(*)::int FROM contact_messages WHERE created_at > now() - interval '7 days') AS "recentMessages"`,
  );

  const [period] = await query(
    `SELECT COALESCE(sum(total_cents) FILTER (WHERE o.created_at >= now() - make_interval(days => $1)), 0)::bigint AS "revenueCents",
            count(*) FILTER (WHERE o.created_at >= now() - make_interval(days => $1))::int AS orders,
            COALESCE(sum(total_cents) FILTER (WHERE o.created_at < now() - make_interval(days => $1)), 0)::bigint AS "prevRevenueCents",
            count(*) FILTER (WHERE o.created_at < now() - make_interval(days => $1))::int AS "prevOrders"
     FROM orders o WHERE ${LIVE} AND o.created_at >= now() - make_interval(days => $1 * 2)`,
    [days],
  );

  const daily = await query(
    `SELECT to_char(d, 'YYYY-MM-DD') AS date,
            COALESCE(sum(o.total_cents), 0)::bigint AS "revenueCents", count(o.id)::int AS orders
     FROM generate_series((now() AT TIME ZONE 'Africa/Cairo')::date - ($1 - 1), (now() AT TIME ZONE 'Africa/Cairo')::date, interval '1 day') AS d
     LEFT JOIN orders o ON ${CAIRO_DAY} = d AND ${LIVE}
     GROUP BY d ORDER BY d`,
    [days],
  );

  const statusRows = await query("SELECT status, count(*)::int AS n FROM orders GROUP BY status");
  const topProducts = await query(
    `SELECT i.product_name AS name, sum(i.quantity)::int AS units, sum(i.quantity * i.unit_price_cents)::bigint AS "revenueCents",
            max(i.image_url) AS "imageUrl"
     FROM order_items i JOIN orders o ON o.id = i.order_id
     WHERE ${LIVE} AND o.created_at >= now() - make_interval(days => $1)
     GROUP BY i.product_name ORDER BY units DESC, name LIMIT 5`,
    [days],
  );
  const lowStock = await query(
    `SELECT p.id AS "productId", p.name, p.slug, v.size, v.stock
     FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE p.active AND v.stock <= $1 ORDER BY v.stock, p.name, v.sort_order LIMIT 12`,
    [LOW_STOCK_AT],
  );
  const recentOrders = await query(
    `SELECT o.id, o.order_number AS "orderNumber", o.status, o.created_at AS "createdAt", o.customer_name AS "customerName",
            o.total_cents AS "totalCents"
     FROM orders o ORDER BY o.created_at DESC LIMIT 6`,
  );

  return {
    ...totals,
    revenueCents: Number(totals.revenueCents),
    period: {
      days,
      revenueCents: Number(period.revenueCents), orders: period.orders,
      prevRevenueCents: Number(period.prevRevenueCents), prevOrders: period.prevOrders,
    },
    daily: daily.map((d) => ({ ...d, revenueCents: Number(d.revenueCents) })),
    statusCounts: Object.fromEntries(statusRows.map((r) => [r.status, r.n])),
    topProducts: topProducts.map((t) => ({ ...t, revenueCents: Number(t.revenueCents) })),
    lowStock,
    lowStockAt: LOW_STOCK_AT,
    recentOrders,
  };
}
