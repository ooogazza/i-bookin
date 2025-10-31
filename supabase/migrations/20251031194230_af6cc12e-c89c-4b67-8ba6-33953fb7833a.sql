-- Ensure RLS is enabled on target tables
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_plot_invoices ENABLE ROW LEVEL SECURITY;

-- Allow admins to update bookings (e.g., set confirmed_by_admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookings' AND policyname = 'Admins can update bookings'
  ) THEN
    CREATE POLICY "Admins can update bookings"
    ON public.bookings
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Allow admins to update non-plot invoices (e.g., set status = 'confirmed')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'non_plot_invoices' AND policyname = 'Admins can update non-plot invoices'
  ) THEN
    CREATE POLICY "Admins can update non-plot invoices"
    ON public.non_plot_invoices
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;