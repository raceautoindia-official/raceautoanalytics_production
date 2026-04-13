-- Migration: Flash Report User Country Slots
-- Run once against production_forecast database.
-- This table permanently stores the Flash Report country slots assigned per user.
-- Slots are fixed once assigned: no delete, no replace.

CREATE TABLE IF NOT EXISTS flash_report_user_countries (
  id                         INT          NOT NULL AUTO_INCREMENT,
  email                      VARCHAR(255) NOT NULL,
  country_id                 VARCHAR(100) NOT NULL,
  slot_index                 INT          NOT NULL,
  effective_plan_at_selection VARCHAR(50)  DEFAULT NULL,
  access_type                VARCHAR(50)  DEFAULT NULL,    -- 'direct' | 'shared' | 'none'
  source_owner_email         VARCHAR(255) DEFAULT NULL,    -- parent email if shared plan
  created_at                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- One country cannot be assigned twice to the same user
  UNIQUE KEY uq_email_country (email, country_id),

  -- One slot index cannot be used twice for the same user
  UNIQUE KEY uq_email_slot (email, slot_index),

  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
