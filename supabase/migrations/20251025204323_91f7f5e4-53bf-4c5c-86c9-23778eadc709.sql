-- Create table to track plot assignment history
CREATE TABLE IF NOT EXISTS public.plot_assignment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  removed_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  removed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plot_assignment_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage plot assignment history"
ON public.plot_assignment_history
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own assignment history"
ON public.plot_assignment_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_plot_assignment_history_plot_id ON public.plot_assignment_history(plot_id);
CREATE INDEX idx_plot_assignment_history_user_id ON public.plot_assignment_history(user_id);

-- Create function to automatically track assignments
CREATE OR REPLACE FUNCTION public.track_plot_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When assigned_to changes from NULL to a user
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.plot_assignment_history (plot_id, user_id, assigned_by)
    VALUES (NEW.id, NEW.assigned_to, auth.uid());
  END IF;
  
  -- When assigned_to changes from a user to NULL (removed)
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL THEN
    UPDATE public.plot_assignment_history
    SET removed_at = now(), removed_by = auth.uid()
    WHERE plot_id = NEW.id AND user_id = OLD.assigned_to AND removed_at IS NULL;
  END IF;
  
  -- When assigned_to changes from one user to another
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NOT NULL AND OLD.assigned_to != NEW.assigned_to THEN
    -- Mark old assignment as removed
    UPDATE public.plot_assignment_history
    SET removed_at = now(), removed_by = auth.uid()
    WHERE plot_id = NEW.id AND user_id = OLD.assigned_to AND removed_at IS NULL;
    
    -- Add new assignment
    INSERT INTO public.plot_assignment_history (plot_id, user_id, assigned_by)
    VALUES (NEW.id, NEW.assigned_to, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER track_plot_assignments
AFTER INSERT OR UPDATE ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.track_plot_assignment();