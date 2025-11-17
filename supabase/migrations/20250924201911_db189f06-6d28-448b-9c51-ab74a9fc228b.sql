-- Insert 3 specific demo users into profiles table
INSERT INTO public.profiles (id, full_name, email, user_type, avatar_url) VALUES
('550e8400-e29b-41d4-a716-446655440007', 'Juan Pérez', 'juan.perez@demo.com', 'pilot', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face'),
('550e8400-e29b-41d4-a716-446655440008', 'María González', 'maria.gonzalez@demo.com', 'pilot', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face'),
('550e8400-e29b-41d4-a716-446655440009', 'Pedro Ramírez', 'pedro.ramirez@demo.com', 'pilot', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face');

-- Insert user roles for new demo pilots
INSERT INTO public.user_roles (id, role) VALUES
('550e8400-e29b-41d4-a716-446655440007', 'pilot'),
('550e8400-e29b-41d4-a716-446655440008', 'pilot'),
('550e8400-e29b-41d4-a716-446655440009', 'pilot');

-- Insert new demo pilots with specific requirements
INSERT INTO public.pilots (id, user_id, phone, certifications, certification_status, status) VALUES
('750e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440007', '+34 622 111 222', ARRAY['AESA A1/A3', 'Piloto Comercial UAS', 'Operador Especializado'], true, 'active'),
('750e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440008', '+34 633 333 444', ARRAY['AESA A1/A3', 'Inspector Técnico Certificado', 'Topografía Aérea'], true, 'active'),
('750e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440009', '+34 644 555 666', ARRAY['AESA A2', 'Curso Básico UAS'], false, 'pending');

-- Insert demo pilot services for Juan Pérez
INSERT INTO public.pilot_services (pilot_id, service_type, description, price_per_hour, is_published) VALUES
('750e8400-e29b-41d4-a716-446655440005', 'Fotografía Aérea', 'Fotografía y video aéreo profesional para eventos sociales, bodas y celebraciones', 90.00, true),
('750e8400-e29b-41d4-a716-446655440005', 'Video para Eventos', 'Cobertura audiovisual completa de eventos corporativos y sociales con drones', 110.00, true);

-- Insert demo pilot services for María González
INSERT INTO public.pilot_services (pilot_id, service_type, description, price_per_hour, is_published) VALUES
('750e8400-e29b-41d4-a716-446655440006', 'Inspecciones Técnicas', 'Inspecciones detalladas de estructuras, edificios e infraestructuras industriales', 135.00, true),
('750e8400-e29b-41d4-a716-446655440006', 'Topografía', 'Levantamientos topográficos precisos y mapeo de terrenos con tecnología avanzada', 155.00, true);

-- Insert demo pilot services for Pedro Ramírez
INSERT INTO public.pilot_services (pilot_id, service_type, description, price_per_hour, is_published) VALUES
('750e8400-e29b-41d4-a716-446655440007', 'Agricultura de Precisión', 'Monitoreo de cultivos y análisis de salud vegetal con sensores multiespectrales', 100.00, false),
('750e8400-e29b-41d4-a716-446655440007', 'Monitoreo Territorial', 'Vigilancia y control de grandes extensiones de terreno y recursos naturales', 120.00, false);