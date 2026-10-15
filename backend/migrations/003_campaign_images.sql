-- Add campaign model photos to existing catalogs, keeping original product shots.
INSERT INTO product_images (product_id, url, alt, sort_order)
SELECT p.id, '/images/products/' || p.legacy_id || '/model.webp', p.name || ' worn by a model', -1
FROM products p
WHERE p.slug IN ('rise-black-hoodie', 'rise-black-sweatpants', 'rise-grey-sweatpants', 'rise-black-sweatshirt')
  AND p.legacy_id IN ('blackhoodie', 'blackpants', 'greypants', 'blacksweatshirt')
  AND NOT EXISTS (
    SELECT 1 FROM product_images i
    WHERE i.product_id = p.id AND i.url = '/images/products/' || p.legacy_id || '/model.webp'
  );
