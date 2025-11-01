-- Drop existing garages table and recreate with lift structure
DROP TABLE IF EXISTS public.garages CASCADE;

-- Create garage_types table with lift values
CREATE TABLE public.garages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL UNIQUE REFERENCES public.plots(id) ON DELETE CASCADE,
  garage_type TEXT NOT NULL CHECK (garage_type IN ('single', 'double')),
  lift_1_value NUMERIC NOT NULL DEFAULT 0,
  lift_2_value NUMERIC NOT NULL DEFAULT 0,
  cut_ups_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.garages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all garages"
  ON public.garages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view garages on assigned plots"
  ON public.garages FOR SELECT
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

-- Trigger for updated_at
CREATE TRIGGER update_garages_updated_at
  BEFORE UPDATE ON public.garages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update bookings table to add garage_lift_type column
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS garage_lift_type TEXT;

-- Update check constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_lift_or_garage_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_lift_or_garage_check 
  CHECK (
    (lift_value_id IS NOT NULL AND garage_id IS NULL AND plot_id IS NOT NULL) OR
    (garage_id IS NOT NULL AND lift_value_id IS NULL AND plot_id IS NOT NULL AND garage_lift_type IS NOT NULL) OR
    (lift_value_id IS NULL AND garage_id IS NULL AND plot_id IS NULL)
  );