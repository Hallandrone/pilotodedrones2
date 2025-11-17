-- Remove Lemon Squeezy integration fields from user_subscriptions table
-- This migration removes the columns if they exist

-- Drop indexes first
DROP INDEX IF EXISTS idx_user_subscriptions_lemonsqueezy_subscription_id;
DROP INDEX IF EXISTS idx_user_subscriptions_lemonsqueezy_variant_id;
DROP INDEX IF EXISTS idx_user_subscriptions_lemonsqueezy_product_id;

-- Remove columns
ALTER TABLE public.user_subscriptions
DROP COLUMN IF EXISTS lemonsqueezy_product_id,
DROP COLUMN IF EXISTS lemonsqueezy_variant_id,
DROP COLUMN IF EXISTS lemonsqueezy_subscription_id;

