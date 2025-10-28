-- Add new lift types to the enum
ALTER TYPE lift_type ADD VALUE IF NOT EXISTS 'snag_patch_int';
ALTER TYPE lift_type ADD VALUE IF NOT EXISTS 'snag_patch_ext';
ALTER TYPE lift_type ADD VALUE IF NOT EXISTS 'no_ri';