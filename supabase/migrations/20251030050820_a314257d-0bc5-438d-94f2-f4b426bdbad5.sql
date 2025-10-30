-- Create table for house type price history
CREATE TABLE IF NOT EXISTS public.house_type_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  house_type_id UUID NOT NULL REFERENCES public.house_types(id) ON DELETE CASCADE,
  lift_type TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.house_type_price_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view price history"
  ON public.house_type_price_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert price history"
  ON public.house_type_price_history
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add created_at column to house_types if not exists
ALTER TABLE public.house_types 
ADD COLUMN IF NOT EXISTS price_last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_house_type_price_history_house_type_id 
  ON public.house_type_price_history(house_type_id);

CREATE INDEX IF NOT EXISTS idx_house_type_price_history_changed_at 
  ON public.house_type_price_history(changed_at DESC);