-- Create garage type price history similar to house_type_price_history
CREATE TABLE IF NOT EXISTS public.garage_type_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_type_id UUID NOT NULL REFERENCES public.garage_types(id) ON DELETE CASCADE,
  lift_type TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID
);

-- Enable RLS
ALTER TABLE public.garage_type_price_history ENABLE ROW LEVEL SECURITY;

-- Policies: only admins can insert/view history (mirrors house_type_price_history)
CREATE POLICY "Admins can insert garage type price history"
ON public.garage_type_price_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view garage type price history"
ON public.garage_type_price_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'));
