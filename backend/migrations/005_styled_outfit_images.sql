INSERT INTO product_images (product_id, url, alt, sort_order)
SELECT p.id, '/images/products/' || p.legacy_id || '/outfit.webp',
       p.name || ' - Styled outfit flat lay', 16
FROM products p
WHERE p.slug IN ('rise-black-hoodie', 'rise-black-sweatshirt')
  AND p.legacy_id IN ('blackhoodie', 'blacksweatshirt')
  AND NOT EXISTS (
    SELECT 1 FROM product_images i
    WHERE i.product_id = p.id AND i.url = '/images/products/' || p.legacy_id || '/outfit.webp'
  );
