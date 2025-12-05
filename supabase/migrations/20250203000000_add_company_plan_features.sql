-- Migración para características del Plan Empresa
-- 1. Tabla para estadísticas de vistas de perfil
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON public.profile_views(viewed_at);

-- 2. Tabla para contactos/leads desde perfil público
CREATE TABLE IF NOT EXISTS public.profile_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  message TEXT,
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_profile_contacts_profile_id ON public.profile_contacts(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_contacts_status ON public.profile_contacts(status);

-- 3. Agregar campos para sello de empresa certificada
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS certification_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS certification_validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS certification_validated_by UUID REFERENCES public.profiles(id);

-- 4. Agregar campos para destacar empresas en recomendadas
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_companies_is_featured ON public.companies(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_companies_featured_until ON public.companies(featured_until) WHERE featured_until IS NOT NULL;

-- 5. Actualizar CHECK constraint de plan_name para incluir 'profesional' y 'empresa'
ALTER TABLE public.user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_plan_name_check;

ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_plan_name_check 
CHECK (plan_name IN ('basic', 'pro', 'premium', 'profesional', 'empresa'));

-- 6. Agregar campos para soporte prioritario en user_subscriptions
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS whatsapp_priority_support BOOLEAN DEFAULT FALSE;

-- 7. RLS Policies para profile_views
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert profile views"
  ON public.profile_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Profile owners can view their own stats"
  ON public.profile_views FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Admins can view all profile views"
  ON public.profile_views FOR SELECT
  USING (is_admin(auth.uid()));

-- 8. RLS Policies para profile_contacts
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert contacts"
  ON public.profile_contacts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Profile owners can view their own contacts"
  ON public.profile_contacts FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Profile owners can update their own contacts"
  ON public.profile_contacts FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Admins can view all contacts"
  ON public.profile_contacts FOR SELECT
  USING (is_admin(auth.uid()));

-- 9. Comentarios para documentación
COMMENT ON TABLE public.profile_views IS 'Registra todas las vistas de perfiles públicos para estadísticas';
COMMENT ON TABLE public.profile_contacts IS 'Almacena contactos/leads generados desde el botón "Te llamaremos" en perfiles públicos';
COMMENT ON COLUMN public.companies.certification_status IS 'Indica si la empresa tiene el sello "Empresa Certificada" tras validación por admin';
COMMENT ON COLUMN public.companies.is_featured IS 'Indica si la empresa debe aparecer destacada en "Empresas Recomendadas"';
COMMENT ON COLUMN public.companies.featured_until IS 'Fecha hasta la cual la empresa estará destacada';
COMMENT ON COLUMN public.user_subscriptions.whatsapp_priority_support IS 'Indica si el usuario tiene acceso a soporte prioritario por WhatsApp';

