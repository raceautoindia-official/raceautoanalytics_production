-- Migration: add signup verification fields for normal users
-- Idempotent where supported (MySQL 8+ for IF NOT EXISTS on columns)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(25) NULL,
  ADD COLUMN IF NOT EXISTS verification_mode VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_verified TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS email_verification_expires_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS phone_otp_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS phone_otp_expires_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS otp_last_sent_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS otp_attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL;

ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_users_verification_mode (verification_mode),
  ADD INDEX IF NOT EXISTS idx_users_email_verification_expires (email_verification_expires_at),
  ADD INDEX IF NOT EXISTS idx_users_phone_otp_expires (phone_otp_expires_at);
