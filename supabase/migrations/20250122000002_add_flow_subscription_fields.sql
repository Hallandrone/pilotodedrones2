-- Add Flow integration fields to user_subscriptions table
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS flow_plan_id TEXT,
ADD COLUMN IF NOT EXISTS flow_subscription_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_flow_subscription_id 
ON public.user_subscriptions(flow_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_flow_plan_id 
ON public.user_subscriptions(flow_plan_id);

-- Add comments for documentation
COMMENT ON COLUMN public.user_subscriptions.flow_plan_id IS 'ID del plan de suscripción en Flow';
COMMENT ON COLUMN public.user_subscriptions.flow_subscription_id IS 'ID de la suscripción activa en Flow';

