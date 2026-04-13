-- Migration: forecast_user_regions
-- Stores permanently assigned Forecast region slots per user.
--
-- Each row = one region slot assigned to a user.
-- region_name stores the contentHierarchy node name (e.g. "South Asia"),
-- which is consistent across all forecast categories.
--
-- Rules:
--   - Slots are permanent once assigned (no delete / reassign).
--   - Direct paid users assign their own regions via POST /api/forecast/user-regions.
--   - Shared paid users inherit the plan owner's regions at read time (no own rows needed).
--   - Free users do NOT use this table (they use the legacy forecast_user_countries flow).

CREATE TABLE IF NOT EXISTS forecast_user_regions (
  id                         INT NOT NULL AUTO_INCREMENT,
  email                      VARCHAR(255) NOT NULL,
  region_name                VARCHAR(255) NOT NULL,
  slot_index                 INT NOT NULL,
  effective_plan_at_selection VARCHAR(50) DEFAULT NULL,
  access_type                VARCHAR(50)  DEFAULT NULL,
  source_owner_email         VARCHAR(255) DEFAULT NULL,
  created_at                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email_region (email, region_name),
  UNIQUE KEY uq_email_slot   (email, slot_index),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
