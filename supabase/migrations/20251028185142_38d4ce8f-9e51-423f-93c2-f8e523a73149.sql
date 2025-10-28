-- Update existing snag_patch to snag_patch_int
UPDATE lift_values 
SET lift_type = 'snag_patch_int' 
WHERE lift_type = 'snag_patch';