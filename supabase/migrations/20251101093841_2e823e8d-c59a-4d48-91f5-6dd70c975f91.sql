-- Add new columns for Snag/Patch Int and Snag/Patch Ext to garage_types table
ALTER TABLE public.garage_types 
ADD COLUMN snag_patch_int_value numeric NOT NULL DEFAULT 0,
ADD COLUMN snag_patch_ext_value numeric NOT NULL DEFAULT 0;

-- Add new columns for Snag/Patch Int and Snag/Patch Ext to garages table
ALTER TABLE public.garages 
ADD COLUMN snag_patch_int_value numeric NOT NULL DEFAULT 0,
ADD COLUMN snag_patch_ext_value numeric NOT NULL DEFAULT 0;