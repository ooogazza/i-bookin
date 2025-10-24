-- Update gang_divisions constraint to match UI values
ALTER TABLE public.gang_divisions 
DROP CONSTRAINT IF EXISTS gang_divisions_member_type_check;

ALTER TABLE public.gang_divisions 
ADD CONSTRAINT gang_divisions_member_type_check 
CHECK (member_type IN ('bricklayer', 'laborer', 'hod carrier'));