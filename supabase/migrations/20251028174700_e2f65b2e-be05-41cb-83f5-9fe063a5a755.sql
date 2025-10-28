-- Add preview_url column to house_type_drawings table
ALTER TABLE house_type_drawings ADD COLUMN IF NOT EXISTS preview_url TEXT;