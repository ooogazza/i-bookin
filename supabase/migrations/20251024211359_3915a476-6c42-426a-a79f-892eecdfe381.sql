-- Create developers table
CREATE TABLE public.developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for developers
CREATE POLICY "Users can view all developers"
  ON public.developers
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage developers"
  ON public.developers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add developer_id and location to sites table
ALTER TABLE public.sites
  ADD COLUMN developer_id UUID REFERENCES public.developers(id) ON DELETE CASCADE,
  ADD COLUMN location TEXT;

-- Create trigger for developers updated_at
CREATE TRIGGER update_developers_updated_at
  BEFORE UPDATE ON public.developers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the developers
INSERT INTO public.developers (name) VALUES
  ('Barratt Developments'),
  ('Taylor Wimpey'),
  ('Persimmon Homes'),
  ('Bellway'),
  ('Redrow'),
  ('Bloor Homes'),
  ('Vistry Group'),
  ('Cala Homes'),
  ('Berkeley Group'),
  ('Bovis Homes'),
  ('Jones Homes'),
  ('Anwyl Homes'),
  ('Miller Homes'),
  ('Avant Homes'),
  ('Story Homes'),
  ('Keepmoat Homes'),
  ('Countryside Partnerships'),
  ('David Wilson Homes'),
  ('Charles Church'),
  ('Orbit Homes'),
  ('Hill Group'),
  ('Fairview New Homes'),
  ('Weston Homes'),
  ('McCarthy & Stone'),
  ('Linden Homes');