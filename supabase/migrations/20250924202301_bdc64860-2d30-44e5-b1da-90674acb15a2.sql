-- Temporarily allow public access to pilots table for demo purposes
DROP POLICY IF EXISTS "Admins can view all pilots" ON public.pilots;
DROP POLICY IF EXISTS "Pilots can view their own profile" ON public.pilots;

-- Create a temporary public read policy for pilots
CREATE POLICY "Public can view all pilots (demo)" 
ON public.pilots 
FOR SELECT 
USING (true);

-- Temporarily allow public access to pilot_services table
DROP POLICY IF EXISTS "Admins can view all pilot services" ON public.pilot_services;
DROP POLICY IF EXISTS "Pilots can view their own services" ON public.pilot_services;

-- Create a temporary public read policy for pilot services
CREATE POLICY "Public can view all pilot services (demo)" 
ON public.pilot_services 
FOR SELECT 
USING (true);

-- Temporarily allow public access to user_roles table for demo purposes
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Create a temporary public read policy for user roles
CREATE POLICY "Public can view all user roles (demo)" 
ON public.user_roles 
FOR SELECT 
USING (true);