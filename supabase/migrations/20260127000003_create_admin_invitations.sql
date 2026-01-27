CREATE TABLE IF NOT EXISTS public.admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    permissions TEXT[] DEFAULT '{}',
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can manage invitations" ON public.admin_invitations
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.id = auth.uid() AND user_roles.role = 'super_admin'
        )
    );

-- Trigger to auto-assign permissions when user registers
CREATE OR REPLACE FUNCTION public.handle_new_admin_registration()
RETURNS TRIGGER AS $$
DECLARE
    invitation public.admin_invitations%ROWTYPE;
BEGIN
    -- Check if email has pending invitation
    SELECT * INTO invitation
    FROM public.admin_invitations
    WHERE email = new.email;

    IF invitation.id IS NOT NULL THEN
        -- Assign Role
        INSERT INTO public.user_roles (id, role)
        VALUES (new.id, 'admin')
        ON CONFLICT (id) DO UPDATE SET role = 'admin';

        -- Assign Permissions
        IF array_length(invitation.permissions, 1) > 0 THEN
            INSERT INTO public.user_permissions (user_id, permission, granted_by)
            SELECT new.id, unnest(invitation.permissions)::public.admin_permission, invitation.invited_by;
        END IF;

        -- Delete invitation
        DELETE FROM public.admin_invitations WHERE id = invitation.id;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger logic is complex because we want it on auth.users usually, but Supabase triggers on auth.users are tricky to manage via migrations sometimes (requires dbadmin).
-- But profiles is safe. We assume profiles is created immediately.
-- However, if user confirms email? 
-- Let's put it on profiles insert.
DROP TRIGGER IF EXISTS on_profile_created_check_admin_invitation ON public.profiles;
CREATE TRIGGER on_profile_created_check_admin_invitation
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_registration();
