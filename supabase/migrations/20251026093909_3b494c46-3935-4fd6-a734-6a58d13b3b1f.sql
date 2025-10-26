-- Allow lift_value_id to be null for non-plot invoices
ALTER TABLE public.bookings 
ALTER COLUMN lift_value_id DROP NOT NULL;