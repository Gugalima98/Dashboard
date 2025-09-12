-- Revert: Remove the 'role' column from the profiles table.
ALTER TABLE public.profiles
DROP COLUMN role;
