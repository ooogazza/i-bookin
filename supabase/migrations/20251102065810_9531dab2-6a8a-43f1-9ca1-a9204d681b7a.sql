-- Fix RLS policy for garages - allow users to create garages for plots they're assigned to
CREATE POLICY "Users can create garages for assigned plots"
ON garages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM plots 
    WHERE plots.id = garages.plot_id 
    AND plots.assigned_to = auth.uid()
  )
);

-- Also allow users to update garages for their assigned plots
CREATE POLICY "Users can update garages for assigned plots"
ON garages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM plots 
    WHERE plots.id = garages.plot_id 
    AND plots.assigned_to = auth.uid()
  )
);