-- Create table to track viewed invoices by admins
CREATE TABLE public.invoice_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  viewed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(invoice_number, viewed_by)
);

-- Enable RLS
ALTER TABLE public.invoice_views ENABLE ROW LEVEL SECURITY;

-- Allow admins to insert and view
CREATE POLICY "Admins can manage invoice views"
ON public.invoice_views
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_invoice_views_invoice_number ON public.invoice_views(invoice_number);
CREATE INDEX idx_invoice_views_viewed_by ON public.invoice_views(viewed_by);