-- Migration: contact_leads — stores submissions from the public /contact form.
-- Run once against the analytics DB. Additive; nothing else touched.

CREATE TABLE IF NOT EXISTS contact_leads (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  company     VARCHAR(200) DEFAULT NULL,
  phone       VARCHAR(50)  DEFAULT NULL,
  subject     VARCHAR(200) DEFAULT NULL,
  message     TEXT         DEFAULT NULL,
  source      VARCHAR(60)  NOT NULL DEFAULT 'contact',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_contact_created (created_at)
);
