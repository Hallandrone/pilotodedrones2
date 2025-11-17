-- Crear tabla de empresas
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para companies
CREATE POLICY "Public can view all companies"
  ON public.companies FOR SELECT
  USING (true);

CREATE POLICY "Companies can insert their own profile"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Companies can update their own profile"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (is_admin(auth.uid()));

-- Crear tabla de asociación empresa-piloto
CREATE TABLE IF NOT EXISTS public.company_pilots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pilot_id UUID NOT NULL REFERENCES public.pilots(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, pilot_id)
);

-- Habilitar RLS en company_pilots
ALTER TABLE public.company_pilots ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para company_pilots
CREATE POLICY "Public can view all company-pilot associations"
  ON public.company_pilots FOR SELECT
  USING (true);

CREATE POLICY "Companies can manage their pilot associations"
  ON public.company_pilots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = company_pilots.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all associations"
  ON public.company_pilots FOR ALL
  USING (is_admin(auth.uid()));

-- Trigger para actualizar updated_at en companies
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();