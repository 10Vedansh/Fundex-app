-- Phase 5.3: Add original_category for auditability
-- This column preserves the pre-normalization category value.
-- For existing data: the original values were overwritten by the
-- normalization script. Refer to category_normalization_report.md
-- for the mapping table of all 157->49 transformations.
ALTER TABLE fund_master ADD COLUMN IF NOT EXISTS original_category TEXT;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS original_category TEXT;
