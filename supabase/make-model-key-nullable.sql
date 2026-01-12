-- Make model_key nullable in evaluations table
-- This is required for data_labeling playgrounds which don't use models

ALTER TABLE evaluations ALTER COLUMN model_key DROP NOT NULL;
