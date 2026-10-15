-- Expand each existing RISE product gallery without replacing catalog images.
INSERT INTO product_images (product_id, url, alt, sort_order)
SELECT p.id, '/images/products/' || p.legacy_id || '/' || v.filename || '.webp',
       p.name || ' - ' || v.label, v.sort_order
FROM products p
CROSS JOIN (VALUES
  ('walking', 'Walking pose', 10),
  ('seated', 'Seated pose', 11),
  ('side', 'Side view', 12),
  ('back', 'Back view', 13),
  ('detail', 'Fabric and logo detail', 14),
  ('flatlay', 'Flat lay', 15)
) AS v(filename, label, sort_order)
WHERE p.slug IN ('rise-black-hoodie', 'rise-black-sweatpants', 'rise-grey-sweatpants', 'rise-black-sweatshirt')
  AND p.legacy_id IN ('blackhoodie', 'blackpants', 'greypants', 'blacksweatshirt')
  AND NOT EXISTS (
    SELECT 1 FROM product_images i
    WHERE i.product_id = p.id
      AND i.url = '/images/products/' || p.legacy_id || '/' || v.filename || '.webp'
  );
