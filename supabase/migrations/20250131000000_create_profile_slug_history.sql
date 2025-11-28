-- Create profile_slug_history table to track all slugs used by users
-- This ensures QR codes and shared links continue to work even if users change their custom slug
CREATE TABLE IF NOT EXISTS public.profile_slug_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,
  is_current BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, slug)
);

-- Create index for fast lookups by slug
CREATE INDEX IF NOT EXISTS idx_profile_slug_history_slug 
ON public.profile_slug_history(slug);

-- Create index for current slug lookups
CREATE INDEX IF NOT EXISTS idx_profile_slug_history_user_current 
ON public.profile_slug_history(user_id, is_current) 
WHERE is_current = TRUE;

-- Enable RLS
ALTER TABLE public.profile_slug_history ENABLE ROW LEVEL SECURITY;

-- Everyone can view slug history (needed for public profile lookups)
CREATE POLICY "Slug history is viewable by everyone"
  ON public.profile_slug_history FOR SELECT USING (TRUE);

-- Users can insert their own slug history
CREATE POLICY "Users can insert their own slug history"
  ON public.profile_slug_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own slug history
CREATE POLICY "Users can update own slug history"
  ON public.profile_slug_history FOR UPDATE 
  USING (auth.uid() = user_id);

-- Admins can manage all slug history
CREATE POLICY "Admins can manage all slug history"
  ON public.profile_slug_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Migrate existing slugs to history table
INSERT INTO public.profile_slug_history (user_id, slug, is_current, created_at)
SELECT 
  id as user_id,
  public_profile_slug as slug,
  TRUE as is_current,
  updated_at as created_at
FROM public.profiles
WHERE public_profile_slug IS NOT NULL
ON CONFLICT (user_id, slug) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE public.profile_slug_history IS 'Tracks all custom URL slugs used by users. Allows QR codes and shared links to continue working even after users change their custom slug.';
COMMENT ON COLUMN public.profile_slug_history.is_current IS 'Indicates if this is the currently active slug for the user';
COMMENT ON COLUMN public.profile_slug_history.deactivated_at IS 'Timestamp when the slug was deactivated (when user changed to a new slug)';


