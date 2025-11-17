-- Insert 2 additional demo users into profiles table
INSERT INTO public.profiles (id, full_name, email, user_type, avatar_url) VALUES
('550e8400-e29b-41d4-a716-446655440005', 'Roberto Silva Martín', 'roberto.silva@demo.com', 'pilot', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'),
('550e8400-e29b-41d4-a716-446655440006', 'Carmen Delgado Torres', 'carmen.delgado@demo.com', 'pilot', 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face');

-- Insert user roles for new demo pilots
INSERT INTO public.user_roles (id, role) VALUES
('550e8400-e29b-41d4-a716-446655440005', 'pilot'),
('550e8400-e29b-41d4-a716-446655440006', 'pilot');

-- Insert new demo pilots
INSERT INTO public.pilots (id, user_id, phone, certifications, certification_status, status) VALUES
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', '+34 667 123 456', ARRAY['AESA A1/A3', 'Piloto Comercial', 'Operador UAS Avanzado', 'Certificado Internacional'], true, 'active'),
('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', '+34 688 987 654', ARRAY['AESA A2', 'Operador UAS Básico'], false, 'suspended');

-- Insert demo pilot services for Roberto Silva
INSERT INTO public.pilot_services (pilot_id, service_type, description, price_per_hour, is_published) VALUES
('750e8400-e29b-41d4-a716-446655440003', 'Filmación Cinematográfica', 'Producción audiovisual profesional con drones para cine, documentales y publicidad', 200.00, true),
('750e8400-e29b-41d4-a716-446655440003', 'Búsqueda y Rescate', 'Servicios especializados de búsqueda y rescate con drones equipados con cámaras térmicas', 180.00, true),
('750e8400-e29b-41d4-a716-446655440003', 'Eventos Deportivos', 'Cobertura aérea de eventos deportivos y competiciones', 130.00, true),
('750e8400-e29b-41d4-a716-446655440003', 'Modelado 3D', 'Creación de modelos 3D precisos de edificios y terrenos usando fotogrametría', 160.00, false);

-- Insert demo pilot services for Carmen Delgado
INSERT INTO public.pilot_services (pilot_id, service_type, description, price_per_hour, is_published) VALUES
('750e8400-e29b-41d4-a716-446655440004', 'Inspección Solar', 'Inspección de paneles solares y parques fotovoltaicos con cámara termográfica', 140.00, false),
('750e8400-e29b-41d4-a716-446655440004', 'Fotografía Inmobiliaria', 'Fotografía y vídeo aéreo para promoción de propiedades inmobiliarias', 75.00, true),
('750e8400-e29b-41d4-a716-446655440004', 'Control de Fauna', 'Monitoreo y control de poblaciones de fauna salvaje', 90.00, false);