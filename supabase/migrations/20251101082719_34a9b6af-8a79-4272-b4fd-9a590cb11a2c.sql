-- Create garage_types table to store predefined garage configurations
CREATE TABLE IF NOT EXISTS public.garage_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  garage_type TEXT NOT NULL CHECK (garage_type IN ('single', 'double')),
  lift_1_value NUMERIC NOT NULL DEFAULT 0,
  lift_2_value NUMERIC NOT NULL DEFAULT 0,
  cut_ups_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.garage_types ENABLE ROW LEVEL SECURITY;

-- Policies for garage_types
CREATE POLICY "Admins can manage all garage types"
ON public.garage_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view garage types on assigned sites"
ON public.garage_types
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM user_site_assignments
    WHERE user_site_assignments.user_id = auth.uid()
    AND user_site_assignments.site_id = garage_types.site_id
  )
);

-- Add garage_type_id to garages table to reference the garage type
ALTER TABLE public.garages ADD COLUMN IF NOT EXISTS garage_type_id UUID REFERENCES public.garage_types(id) ON DELETE SET NULL;

-- Create trigger for updated_at on garage_types
CREATE TRIGGER update_garage_types_updated_at
BEFORE UPDATE ON public.garage_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();