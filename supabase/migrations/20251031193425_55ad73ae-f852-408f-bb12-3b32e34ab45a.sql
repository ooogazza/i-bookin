-- Enable realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Enable realtime for non_plot_invoices table
ALTER PUBLICATION supabase_realtime ADD TABLE public.non_plot_invoices;