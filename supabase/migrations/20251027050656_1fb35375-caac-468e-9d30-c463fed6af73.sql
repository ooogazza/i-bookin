-- Create table for saved gang members (persistent across invoices)
CREATE TABLE IF NOT EXISTS public.saved_gang_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bricklayer', 'laborer', 'apprentice')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for non-plot invoices
CREATE TABLE IF NOT EXISTS public.non_plot_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  total_amount NUMERIC NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for non-plot invoice gang divisions
CREATE TABLE IF NOT EXISTS public.non_plot_gang_divisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.non_plot_invoices(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_gang_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_plot_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_plot_gang_divisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_gang_members
CREATE POLICY "Users can view their own saved gang members"
  ON public.saved_gang_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved gang members"
  ON public.saved_gang_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved gang members"
  ON public.saved_gang_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved gang members"
  ON public.saved_gang_members FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for non_plot_invoices
CREATE POLICY "Users can view their own non-plot invoices"
  ON public.non_plot_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own non-plot invoices"
  ON public.non_plot_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own non-plot invoices"
  ON public.non_plot_invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all non-plot invoices"
  ON public.non_plot_invoices FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for non_plot_gang_divisions
CREATE POLICY "Users can view gang divisions for their invoices"
  ON public.non_plot_gang_divisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.non_plot_invoices
      WHERE id = invoice_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create gang divisions for their invoices"
  ON public.non_plot_gang_divisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.non_plot_invoices
      WHERE id = invoice_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all gang divisions"
  ON public.non_plot_gang_divisions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger for saved_gang_members
CREATE TRIGGER update_saved_gang_members_updated_at
  BEFORE UPDATE ON public.saved_gang_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for non_plot_invoices
CREATE TRIGGER update_non_plot_invoices_updated_at
  BEFORE UPDATE ON public.non_plot_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();