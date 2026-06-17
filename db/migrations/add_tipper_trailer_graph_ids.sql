-- Adds per-country forecast-graph mapping columns for the Tipper and
-- Tractor-Trailer truck sub-segment charts (Flash Reports).
--
-- These mirror the existing *_graph_id columns in flash_reports_text
-- (overall_graph_id, truck_graph_id, …). After running this, the CMS
-- "Flash Graph Mapping" editor exposes Tipper / Tractor Trailer dropdowns,
-- and /api/flash-reports/config returns `tipper` / `trailer` graph ids.
--
-- Safe / additive: nullable columns, no data change. If your existing
-- *_graph_id columns use a type other than INT, match that type here.

ALTER TABLE flash_reports_text
  ADD COLUMN tipper_graph_id INT NULL AFTER ce_graph_id,
  ADD COLUMN trailer_graph_id INT NULL AFTER tipper_graph_id;
