-- Migration: Insights blog (SEO content flywheel).
-- Run once against the analytics DB. Additive — no existing table touched.
--
--   insight_categories : admin-managed category list (add/edit/delete/reorder)
--   insights           : the posts (one primary category via category_id + free tags)

CREATE TABLE IF NOT EXISTS insight_categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_insight_category_slug (slug)
);

CREATE TABLE IF NOT EXISTS insights (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  slug              VARCHAR(200) NOT NULL,
  title             VARCHAR(300) NOT NULL,
  excerpt           VARCHAR(500) DEFAULT NULL,
  body_html         MEDIUMTEXT   DEFAULT NULL,   -- sanitized Quill HTML
  cover_image_key   VARCHAR(255) DEFAULT NULL,   -- S3 key (uploads/insights/…)
  category_id       INT          DEFAULT NULL,   -- -> insight_categories.id
  tags              VARCHAR(500) DEFAULT NULL,   -- comma-separated
  country_slug      VARCHAR(50)  DEFAULT NULL,   -- optional link to a flash country
  author            VARCHAR(120) NOT NULL DEFAULT 'Race Auto Analytics',
  meta_title        VARCHAR(300) DEFAULT NULL,   -- SEO override (falls back to title)
  meta_description  VARCHAR(500) DEFAULT NULL,   -- SEO override (falls back to excerpt)
  status            ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at      DATETIME     DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_insight_slug (slug),
  KEY idx_insight_status_pub (status, published_at),
  KEY idx_insight_category (category_id),
  KEY idx_insight_country (country_slug)
);

-- Starter categories (id order = sort order). INSERT IGNORE keeps re-runs safe.
INSERT IGNORE INTO insight_categories (name, slug, sort_order) VALUES
  ('Market Analysis',  'market-analysis',   10),
  ('EV Trends',        'ev-trends',         20),
  ('OEM Market Share', 'oem-market-share',  30),
  ('Country Reports',  'country-reports',   40);
