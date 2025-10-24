-- Add new lift types for snag_patch and dod
ALTER TYPE public.lift_type ADD VALUE 'snag_patch';
ALTER TYPE public.lift_type ADD VALUE 'dod';

-- Note: The old 'snag' value will remain for backward compatibility
-- Existing data with 'snag' can be manually updated if needed