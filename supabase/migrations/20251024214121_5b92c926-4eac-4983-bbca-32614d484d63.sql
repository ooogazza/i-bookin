-- Add confirmed column to bookings table to track admin confirmation
ALTER TABLE public.bookings
ADD COLUMN confirmed_by_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX idx_bookings_confirmed_by_admin ON public.bookings(confirmed_by_admin);