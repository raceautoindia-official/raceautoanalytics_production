-- Migration: add free-trial tracking columns to users table
-- Run once against production_forecast DB

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS free_trial_started_at  DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS free_trial_expires_at  DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS free_trial_used        TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_trial_name        VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS free_trial_phone       VARCHAR(50)  NULL;
