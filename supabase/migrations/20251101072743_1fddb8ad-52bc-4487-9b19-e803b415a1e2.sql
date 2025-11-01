-- Create garages table
CREATE TABLE IF NOT EXISTS public.garages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL UNIQUE REFERENCES public.plots(id) ON DELETE CASCADE,
  garage_type TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on garages table
ALTER TABLE public.garages ENABLE ROW LEVEL SECURITY;

-- Admins can manage all garages
CREATE POLICY "Admins can manage all garages"
  ON public.garages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view garages on their assigned plots
CREATE POLICY "Users can view garages on assigned plots"
  ON public.garages
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.plots
      WHERE plots.id = garages.plot_id
      AND plots.assigned_to = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.plots
      INNER JOIN public.user_site_assignments ON plots.site_id = user_site_assignments.site_id
      WHERE plots.id = garages.plot_id
      AND user_site_assignments.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_garages_updated_at
  BEFORE UPDATE ON public.garages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add garage_id to bookings table to support garage bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS garage_id UUID REFERENCES public.garages(id) ON DELETE SET NULL;

-- Add check to ensure booking has either lift_value_id or garage_id, but not both
ALTER TABLE public.bookings ADD CONSTRAINT bookings_lift_or_garage_check 
  CHECK (
    (lift_value_id IS NOT NULL AND garage_id IS NULL AND plot_id IS NOT NULL) OR
    (garage_id IS NOT NULL AND lift_value_id IS NULL AND plot_id IS NOT NULL) OR
    (lift_value_id IS NULL AND garage_id IS NULL AND plot_id IS NULL)
  );

-- Update RLS policy for bookings creation to include garage bookings
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

CREATE POLICY "Users can create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (
    auth.uid() = booked_by AND (
      (plot_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM plots
        WHERE plots.id = bookings.plot_id
        AND plots.assigned_to = auth.uid()
      )) OR
      plot_id IS NULL
    )
  );