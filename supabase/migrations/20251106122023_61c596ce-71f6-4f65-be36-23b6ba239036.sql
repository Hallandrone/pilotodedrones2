-- Create platform_settings table
CREATE TABLE public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name text NOT NULL DEFAULT 'Piloto de Drones',
  logo_url text NOT NULL DEFAULT '/logo.png',
  favicon_url text NOT NULL DEFAULT '/favicon.ico',
  primary_color text NOT NULL DEFAULT '#2563eb',
  secondary_color text NOT NULL DEFAULT '#64748b',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Public can view platform settings
CREATE POLICY "Public can view platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Only admins can update platform settings
CREATE POLICY "Admins can update platform settings"
ON public.platform_settings
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can insert platform settings
CREATE POLICY "Admins can insert platform settings"
ON public.platform_settings
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial configuration
INSERT INTO public.platform_settings (platform_name, logo_url, favicon_url, primary_color, secondary_color)
VALUES ('Piloto de Drones', '/logo.png', '/favicon.ico', '#2563eb', '#64748b');