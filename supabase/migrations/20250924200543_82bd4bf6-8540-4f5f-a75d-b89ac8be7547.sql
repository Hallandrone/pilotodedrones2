-- Create table for pilot information
CREATE TABLE public.pilots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text,
  certifications text[], -- Array of certifications
  certification_status boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create table for pilot services
CREATE TABLE public.pilot_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pilot_id uuid NOT NULL REFERENCES public.pilots(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  description text,
  price_per_hour numeric(10,2),
  is_published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pilots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pilots table
CREATE POLICY "Admins can view all pilots" 
ON public.pilots 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Pilots can view their own profile" 
ON public.pilots 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Pilots can update their own profile" 
ON public.pilots 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Pilots can insert their own profile" 
ON public.pilots 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update pilot status" 
ON public.pilots 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- RLS Policies for pilot_services table
CREATE POLICY "Admins can view all pilot services" 
ON public.pilot_services 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Pilots can view their own services" 
ON public.pilot_services 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.pilots 
    WHERE pilots.id = pilot_services.pilot_id 
    AND pilots.user_id = auth.uid()
  )
);

CREATE POLICY "Pilots can manage their own services" 
ON public.pilot_services 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.pilots 
    WHERE pilots.id = pilot_services.pilot_id 
    AND pilots.user_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_pilots_updated_at
BEFORE UPDATE ON public.pilots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pilot_services_updated_at
BEFORE UPDATE ON public.pilot_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();