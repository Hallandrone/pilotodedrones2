-- Add featured_until column to user_subscriptions table
-- This tracks when a user's subscription was activated for the "24 hours featured" system
-- Users with featured_until > NOW() will be prioritized in the landing page
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.user_subscriptions.featured_until IS 'Timestamp until which the user should be featured on the landing page (24 hours after subscription activation). Users with featured_until > NOW() are prioritized in featured pilots section.';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_featured_until 
ON public.user_subscriptions(featured_until) 
WHERE featured_until IS NOT NULL;

