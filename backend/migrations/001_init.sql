-- RISE store schema. All money is stored in piastres (1 EGP = 100).

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  firebase_uid  TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  mobile        TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  totp_secret_enc TEXT,
  totp_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  totp_failed_attempts INT NOT NULL DEFAULT 0,
  totp_locked_until TIMESTAMPTZ,
  backup_code_hashes TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Home',
  governorate TEXT NOT NULL,
  city        TEXT NOT NULL,
  address     TEXT NOT NULL,
  apartment   TEXT NOT NULL DEFAULT '',
  mobile      TEXT NOT NULL DEFAULT '',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE collections (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  legacy_id     TEXT UNIQUE,
  sku           TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  subtitle      TEXT NOT NULL DEFAULT '',
  color         TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  material      TEXT NOT NULL DEFAULT '',
  weight        TEXT NOT NULL DEFAULT '',
  fit           TEXT NOT NULL DEFAULT '',
  care          TEXT NOT NULL DEFAULT '',
  price_cents   INT NOT NULL CHECK (price_cents >= 0),
  compare_price_cents INT,
  category_id   INT REFERENCES categories(id) ON DELETE SET NULL,
  collection_id INT REFERENCES collections(id) ON DELETE SET NULL,
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  coming_soon   BOOLEAN NOT NULL DEFAULT FALSE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_images (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE product_variants (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size       TEXT NOT NULL,
  stock      INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (product_id, size)
);

-- "Buy N, get P% off the next (cheapest) item" automatic offer.
-- A deal with no rows in deal_products applies to every product.
CREATE TABLE deals (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  buy_qty          INT NOT NULL CHECK (buy_qty >= 1),
  discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ
);

CREATE TABLE deal_products (
  deal_id    INT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, product_id)
);

CREATE TABLE promo_codes (
  id            SERIAL PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  value         INT NOT NULL CHECK (value > 0),  -- percent, or piastres when fixed
  description   TEXT NOT NULL DEFAULT '',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at    TIMESTAMPTZ
);

CREATE TABLE shipping_rates (
  governorate TEXT PRIMARY KEY,
  cost_cents  INT NOT NULL CHECK (cost_cents >= 0)
);

CREATE TABLE announcements (
  id         SERIAL PRIMARY KEY,
  text       TEXT NOT NULL,
  link       TEXT NOT NULL DEFAULT '',
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE SEQUENCE order_number_seq START 1001;

CREATE TABLE orders (
  id             SERIAL PRIMARY KEY,
  order_number   TEXT UNIQUE NOT NULL,
  user_id        INT REFERENCES users(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','shipped','delivered','canceled','returned')),
  customer_name  TEXT NOT NULL,
  email          TEXT NOT NULL,
  mobile         TEXT NOT NULL,
  governorate    TEXT NOT NULL,
  city           TEXT NOT NULL,
  address        TEXT NOT NULL,
  apartment      TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',
  promo_code     TEXT,
  subtotal_cents INT NOT NULL,
  discount_cents INT NOT NULL,
  shipping_cents INT NOT NULL,
  total_cents    INT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON orders(user_id);
CREATE INDEX orders_status_idx ON orders(status);

CREATE TABLE order_items (
  id               SERIAL PRIMARY KEY,
  order_id         INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INT REFERENCES products(id) ON DELETE SET NULL,
  product_name     TEXT NOT NULL,
  color            TEXT NOT NULL DEFAULT '',
  size             TEXT NOT NULL,
  quantity         INT NOT NULL CHECK (quantity > 0),
  unit_price_cents INT NOT NULL,
  image_url        TEXT NOT NULL DEFAULT ''
);

CREATE TABLE order_status_history (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE newsletter_subscribers (
  id         SERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contact_messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
