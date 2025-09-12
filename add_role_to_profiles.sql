-- Add a 'role' column to the profiles table to distinguish between regular users and admins.
ALTER TABLE public.profiles
ADD COLUMN role TEXT DEFAULT 'user';

-- Create a policy so that users can view their own role, but not change it.
CREATE POLICY "Users can view their own role."
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Note: Role assignment should be done directly in the Supabase dashboard for security.
-- To make a user an admin, update their 'role' to 'admin' in the 'profiles' table.
COMMENT ON COLUMN public.profiles.role IS 'User role, e.g., 'user' or 'admin'';
