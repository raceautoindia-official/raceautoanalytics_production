-- Rationale rows shown under the segment forecast share chart: for each OEM,
-- a rank badge and a short written explanation of why the forecast puts them
-- where it does.
--
-- Scoped by country + segment so each flash-report page has its own set, the
-- same way the chart data is scoped in the CMS hierarchy.
--
-- Run BEFORE deploying the code that reads it. The API degrades to an empty
-- list if the table is missing, but the CMS editor needs it to save.

CREATE TABLE IF NOT EXISTS flash_segment_forecast_reasons (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  country_key   VARCHAR(64)  NOT NULL,
  segment_key   VARCHAR(64)  NOT NULL,
  rank_index    INT          NOT NULL DEFAULT 1,
  oem_name      VARCHAR(255) NOT NULL,
  description   TEXT         NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_country_segment_oem (country_key, segment_key, oem_name),
  KEY idx_lookup (country_key, segment_key, rank_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
