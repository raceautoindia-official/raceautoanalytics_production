ALTER TABLE users
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS subscription_email_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  reference_key VARCHAR(128) NOT NULL,
  payload JSON NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_subscription_email_event (email, event_type, reference_key),
  KEY idx_subscription_email_type_sent (event_type, sent_at)
);
