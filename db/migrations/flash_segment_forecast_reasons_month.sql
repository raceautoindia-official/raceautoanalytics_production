-- Make the forecast rationale rows month-aware, so editors can write a
-- different explanation for each forecast month and the site's month dropdown
-- shows it.
--
-- month_key is 'YYYY-MM', or '' for the default set used when a month has no
-- rows of its own. Empty string rather than NULL so the unique key still
-- prevents duplicates (MySQL allows repeated NULLs in a unique index).
--
-- Existing rows keep month_key = '' and therefore become the default set.
--
-- Run BEFORE deploying the code that reads it.

ALTER TABLE flash_segment_forecast_reasons
  ADD COLUMN month_key VARCHAR(7) NOT NULL DEFAULT '' AFTER segment_key;

ALTER TABLE flash_segment_forecast_reasons
  DROP INDEX uq_country_segment_oem;

ALTER TABLE flash_segment_forecast_reasons
  ADD UNIQUE KEY uq_country_segment_month_oem
    (country_key, segment_key, month_key, oem_name);

ALTER TABLE flash_segment_forecast_reasons
  DROP INDEX idx_lookup;

ALTER TABLE flash_segment_forecast_reasons
  ADD KEY idx_lookup (country_key, segment_key, month_key, rank_index);
