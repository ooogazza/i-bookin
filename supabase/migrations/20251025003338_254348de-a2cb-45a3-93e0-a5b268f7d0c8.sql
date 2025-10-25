-- Add policy to allow admins to update bookings
CREATE POLICY "Admins can update all bookings" ON public.bookings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));