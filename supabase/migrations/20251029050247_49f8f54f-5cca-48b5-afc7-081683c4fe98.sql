-- Add email column to saved_gang_members table
ALTER TABLE saved_gang_members
ADD COLUMN email text;

-- Add email column to gang_divisions table
ALTER TABLE gang_divisions
ADD COLUMN email text;

-- Add email column to non_plot_gang_divisions table
ALTER TABLE non_plot_gang_divisions
ADD COLUMN email text;