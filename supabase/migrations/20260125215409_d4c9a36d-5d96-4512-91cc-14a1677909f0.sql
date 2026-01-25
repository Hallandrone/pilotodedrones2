-- Create enum for granular permissions
CREATE TYPE public.admin_permission AS ENUM (
  'create_diplomas',
  'manage_certificates', 
  'view_users',
  'view_companies',
  'view_notifications',
  'manage_banners'
);

-- Create user_permissions table for granular access control
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission admin_permission NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission admin_permission)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE id = _user_id AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id AND permission = _permission
  );
$$;

-- Create function to get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE id = _user_id AND role = 'super_admin')
    THEN ARRAY['create_diplomas', 'manage_certificates', 'view_users', 'view_companies', 'view_notifications', 'manage_banners']
    ELSE COALESCE(
      (SELECT array_agg(permission::text) FROM public.user_permissions WHERE user_id = _user_id),
      ARRAY[]::text[]
    )
  END;
$$;

-- RLS Policies for user_permissions
CREATE POLICY "Super admins can manage all permissions"
ON public.user_permissions
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (user_id = auth.uid());

-- Index for faster permission lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON public.user_permissions(permission);