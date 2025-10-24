-- Add plot and house type count to sites
ALTER TABLE public.sites 
ADD COLUMN number_of_plots integer NOT NULL DEFAULT 0,
ADD COLUMN number_of_house_types integer NOT NULL DEFAULT 0;

-- Create plots table
CREATE TABLE public.plots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  plot_number integer NOT NULL,
  house_type_id uuid REFERENCES public.house_types(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(site_id, plot_number)
);

-- Create user site assignments table
CREATE TABLE public.user_site_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, site_id)
);

-- Add invoice fields to bookings
ALTER TABLE public.bookings
ADD COLUMN invoice_number text,
ADD COLUMN status text NOT NULL DEFAULT 'draft',
ADD COLUMN plot_id uuid REFERENCES public.plots(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_site_assignments ENABLE ROW LEVEL SECURITY;

-- Plots RLS policies
CREATE POLICY "Admins can manage all plots"
ON public.plots FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view assigned plots"
ON public.plots FOR SELECT
USING (
  assigned_to = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- User site assignments RLS policies
CREATE POLICY "Admins can manage site assignments"
ON public.user_site_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their site assignments"
ON public.user_site_assignments FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Update bookings RLS to check plot assignment
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings"
ON public.bookings FOR INSERT
WITH CHECK (
  auth.uid() = booked_by AND
  EXISTS (
    SELECT 1 FROM public.plots
    WHERE plots.id = bookings.plot_id
    AND plots.assigned_to = auth.uid()
  )
);

-- Add trigger for plots updated_at
CREATE TRIGGER update_plots_updated_at
BEFORE UPDATE ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update gang_divisions to allow updates and deletes
CREATE POLICY "Users can update gang divisions for their bookings"
ON public.gang_divisions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = gang_divisions.booking_id
    AND bookings.booked_by = auth.uid()
  )
);

CREATE POLICY "Users can delete gang divisions for their bookings"
ON public.gang_divisions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = gang_divisions.booking_id
    AND bookings.booked_by = auth.uid()
  )
);