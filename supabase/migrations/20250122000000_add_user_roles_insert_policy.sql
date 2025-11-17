-- Add INSERT policy for user_roles table
-- This allows users to create their own role if the trigger fails
CREATE POLICY "Users can insert their own role"
  ON public.user_roles FOR INSERT 
  WITH CHECK (auth.uid() = id);

