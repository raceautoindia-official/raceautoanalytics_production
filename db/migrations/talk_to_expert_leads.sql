-- Stores "Talk to an Expert" enquiries so each can be approved/declined from the
-- admin notification email; the token secures those one-click action links.
CREATE TABLE IF NOT EXISTS talk_to_expert_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  preferred_date VARCHAR(32) NOT NULL,
  preferred_time VARCHAR(64) NOT NULL,
  message TEXT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  token VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
