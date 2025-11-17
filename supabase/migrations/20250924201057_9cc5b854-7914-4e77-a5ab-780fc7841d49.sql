-- Temporarily disable foreign key constraints to insert demo data
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_id_fkey;

-- Insert demo users into profiles table
INSERT INTO public.profiles (id, full_name, email, user_type, avatar_url) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Ana García López', 'ana.garcia@demo.com', 'pilot', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'),
('550e8400-e29b-41d4-a716-446655440002', 'Carlos Rodríguez', 'carlos.rodriguez@demo.com', 'company', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'),
('550e8400-e29b-41d4-a716-446655440003', 'María Fernández', 'maria.fernandez@demo.com', 'pilot', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'),
('550e8400-e29b-41d4-a716-446655440004', 'Diego Morales', 'diego.morales@demo.com', 'admin', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face');

-- Insert demo user roles
INSERT INTO public.user_roles (id, role) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'pilot'),
('550e8400-e29b-41d4-a716-446655440002', 'company'),
('550e8400-e29b-41d4-a716-446655440003', 'pilot'),
('550e8400-e29b-41d4-a716-446655440004', 'admin');

-- Insert demo pilots
INSERT INTO public.pilots (id, user_id, phone, certifications, certification_status, status) VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '+34 612 345 678', ARRAY['AESA A1/A3', 'Operador UAS', 'Piloto Remoto'], true, 'active'),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '+34 698 765 432', ARRAY['AESA A1/A3', 'Certificado Europeo'], false, 'pending');

-- Insert demo pilot services
INSERT INTO public.pilot_services (pilot_id, service_type, description, price_per_hour, is_published) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'Fotografía Aérea', 'Servicios profesionales de fotografía y vídeo aéreo para eventos, bodas y proyectos comerciales', 85.00, true),
('750e8400-e29b-41d4-a716-446655440001', 'Inspecciones Técnicas', 'Inspecciones de infraestructuras, edificios y instalaciones industriales con drones especializados', 120.00, true),
('750e8400-e29b-41d4-a716-446655440001', 'Topografía y Cartografía', 'Levantamientos topográficos y creación de mapas precisos usando tecnología LiDAR', 150.00, false),
('750e8400-e29b-41d4-a716-446655440002', 'Agricultura de Precisión', 'Monitoreo de cultivos, análisis multiespectrales y optimización de recursos agrícolas', 95.00, true),
('750e8400-e29b-41d4-a716-446655440002', 'Vigilancia y Seguridad', 'Servicios de vigilancia perimetral y monitoreo de seguridad para eventos y propiedades', 110.00, false);