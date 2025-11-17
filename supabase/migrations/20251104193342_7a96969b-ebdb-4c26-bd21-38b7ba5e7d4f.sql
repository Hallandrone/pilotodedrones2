
-- Insert 5 demo pilot profiles
WITH pilot_profiles AS (
  INSERT INTO public.profiles (id, full_name, user_type, email, phone, bio, location, region, experience_years, specialties, drone_types, avatar_url)
  VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Carlos Méndez', 'pilot', 'carlos.mendez@demo.cl', '+56912345001', 'Piloto especializado en fotografía aérea y eventos. Más de 5 años de experiencia en el rubro.', 'Santiago', 'Metropolitana', 5, ARRAY['Fotografía', 'Eventos'], ARRAY['DJI Mavic 3', 'DJI Mini 3'], 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos'),
    ('22222222-2222-2222-2222-222222222222', 'María González', 'pilot', 'maria.gonzalez@demo.cl', '+56912345002', 'Experta en topografía y mapeo con drones. Certificada en fotogrametría avanzada.', 'Valparaíso', 'Valparaíso', 8, ARRAY['Topografía', 'Mapeo'], ARRAY['DJI Phantom 4 RTK', 'DJI Matrice 300'], 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria'),
    ('33333333-3333-3333-3333-333333333333', 'Pedro Ramírez', 'pilot', 'pedro.ramirez@demo.cl', '+56912345003', 'Piloto agrícola con experiencia en fumigación y análisis de cultivos mediante imágenes multiespectrales.', 'Rancagua', 'O''Higgins', 3, ARRAY['Agricultura', 'Fumigación'], ARRAY['DJI Agras T30', 'DJI Mavic 3 Multispectral'], 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro'),
    ('44444444-4444-4444-4444-444444444444', 'Ana Torres', 'pilot', 'ana.torres@demo.cl', '+56912345004', 'Especialista en inspección industrial y de infraestructura. Trabajo en altura y estructuras complejas.', 'Concepción', 'Biobío', 6, ARRAY['Inspección', 'Industrial'], ARRAY['DJI Mavic 2 Enterprise', 'Autel EVO II'], 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana'),
    ('55555555-5555-5555-5555-555555555555', 'Roberto Silva', 'pilot', 'roberto.silva@demo.cl', '+56912345005', 'Piloto cinematográfico y de publicidad. Experto en tomas dinámicas y producción audiovisual profesional.', 'Viña del Mar', 'Valparaíso', 10, ARRAY['Cinematografía', 'Publicidad'], ARRAY['DJI Inspire 3', 'FPV Custom'], 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto')
  RETURNING id
),
pilot_roles AS (
  INSERT INTO public.user_roles (id, role)
  SELECT id, 'pilot'::public.user_role FROM pilot_profiles
),
pilot_data AS (
  INSERT INTO public.pilots (id, user_id, phone, certification_status, status, certification_academy)
  SELECT 
    CASE 
      WHEN id = '11111111-1111-1111-1111-111111111111' THEN 'aaaabbbb-1111-1111-1111-111111111111'::uuid
      WHEN id = '22222222-2222-2222-2222-222222222222' THEN 'aaaabbbb-2222-2222-2222-222222222222'::uuid
      WHEN id = '33333333-3333-3333-3333-333333333333' THEN 'aaaabbbb-3333-3333-3333-333333333333'::uuid
      WHEN id = '44444444-4444-4444-4444-444444444444' THEN 'aaaabbbb-4444-4444-4444-444444444444'::uuid
      WHEN id = '55555555-5555-5555-5555-555555555555' THEN 'aaaabbbb-5555-5555-5555-555555555555'::uuid
    END,
    id,
    CASE 
      WHEN id = '11111111-1111-1111-1111-111111111111' THEN '+56912345001'
      WHEN id = '22222222-2222-2222-2222-222222222222' THEN '+56912345002'
      WHEN id = '33333333-3333-3333-3333-333333333333' THEN '+56912345003'
      WHEN id = '44444444-4444-4444-4444-444444444444' THEN '+56912345004'
      WHEN id = '55555555-5555-5555-5555-555555555555' THEN '+56912345005'
    END,
    true,
    'active',
    CASE 
      WHEN id = '11111111-1111-1111-1111-111111111111' THEN 'Academia Drone Chile'
      WHEN id = '22222222-2222-2222-2222-222222222222' THEN 'Escuela de Drones Profesionales'
      WHEN id = '33333333-3333-3333-3333-333333333333' THEN 'Instituto Agro Drones'
      WHEN id = '44444444-4444-4444-4444-444444444444' THEN 'Centro de Capacitación Industrial'
      WHEN id = '55555555-5555-5555-5555-555555555555' THEN 'Academia Cinematográfica Aérea'
    END
  FROM pilot_profiles
  RETURNING id, user_id
),
-- Insert 5 demo company profiles
company_profiles AS (
  INSERT INTO public.profiles (id, full_name, user_type, email, phone, location, region, avatar_url)
  VALUES 
    ('66666666-6666-6666-6666-666666666666', 'AeroVision Chile', 'company', 'contacto@aerovision.cl', '+56912346001', 'Santiago', 'Metropolitana', 'https://api.dicebear.com/7.x/shapes/svg?seed=AeroVision'),
    ('77777777-7777-7777-7777-777777777777', 'DronesTech Pro', 'company', 'info@dronestech.cl', '+56912346002', 'Valparaíso', 'Valparaíso', 'https://api.dicebear.com/7.x/shapes/svg?seed=DronesTech'),
    ('88888888-8888-8888-8888-888888888888', 'Agro Drones SpA', 'company', 'ventas@agrodrones.cl', '+56912346003', 'Talca', 'Maule', 'https://api.dicebear.com/7.x/shapes/svg?seed=AgroDrones'),
    ('99999999-9999-9999-9999-999999999999', 'SkyInspect', 'company', 'contacto@skyinspect.cl', '+56912346004', 'Concepción', 'Biobío', 'https://api.dicebear.com/7.x/shapes/svg?seed=SkyInspect'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aerial Media Group', 'company', 'info@aerialmedia.cl', '+56912346005', 'Viña del Mar', 'Valparaíso', 'https://api.dicebear.com/7.x/shapes/svg?seed=AerialMedia')
  RETURNING id
),
company_roles AS (
  INSERT INTO public.user_roles (id, role)
  SELECT id, 'company'::public.user_role FROM company_profiles
),
company_data AS (
  INSERT INTO public.companies (id, user_id, company_name, description, website)
  SELECT 
    CASE 
      WHEN id = '66666666-6666-6666-6666-666666666666' THEN 'ccccdddd-6666-6666-6666-666666666666'::uuid
      WHEN id = '77777777-7777-7777-7777-777777777777' THEN 'ccccdddd-7777-7777-7777-777777777777'::uuid
      WHEN id = '88888888-8888-8888-8888-888888888888' THEN 'ccccdddd-8888-8888-8888-888888888888'::uuid
      WHEN id = '99999999-9999-9999-9999-999999999999' THEN 'ccccdddd-9999-9999-9999-999999999999'::uuid
      WHEN id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN 'ccccdddd-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
    END,
    id,
    CASE 
      WHEN id = '66666666-6666-6666-6666-666666666666' THEN 'AeroVision Chile'
      WHEN id = '77777777-7777-7777-7777-777777777777' THEN 'DronesTech Pro'
      WHEN id = '88888888-8888-8888-8888-888888888888' THEN 'Agro Drones SpA'
      WHEN id = '99999999-9999-9999-9999-999999999999' THEN 'SkyInspect'
      WHEN id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN 'Aerial Media Group'
    END,
    CASE 
      WHEN id = '66666666-6666-6666-6666-666666666666' THEN 'Empresa líder en servicios de fotografía y video aéreo para eventos corporativos y sociales.'
      WHEN id = '77777777-7777-7777-7777-777777777777' THEN 'Especialistas en topografía, mapeo y modelado 3D con tecnología de última generación.'
      WHEN id = '88888888-8888-8888-8888-888888888888' THEN 'Soluciones agrícolas con drones: fumigación, análisis multispectral y monitoreo de cultivos.'
      WHEN id = '99999999-9999-9999-9999-999999999999' THEN 'Inspección industrial y de infraestructura crítica con drones certificados.'
      WHEN id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN 'Producción audiovisual profesional y cinematografía aérea para cine, TV y publicidad.'
    END,
    CASE 
      WHEN id = '66666666-6666-6666-6666-666666666666' THEN 'https://aerovision.cl'
      WHEN id = '77777777-7777-7777-7777-777777777777' THEN 'https://dronestech.cl'
      WHEN id = '88888888-8888-8888-8888-888888888888' THEN 'https://agrodrones.cl'
      WHEN id = '99999999-9999-9999-9999-999999999999' THEN 'https://skyinspect.cl'
      WHEN id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN 'https://aerialmedia.cl'
    END
  FROM company_profiles
  RETURNING id as company_id
)
-- Associate some pilots with companies
INSERT INTO public.company_pilots (company_id, pilot_id)
SELECT 
  'ccccdddd-6666-6666-6666-666666666666'::uuid,
  'aaaabbbb-1111-1111-1111-111111111111'::uuid
UNION ALL
SELECT 
  'ccccdddd-6666-6666-6666-666666666666'::uuid,
  'aaaabbbb-2222-2222-2222-222222222222'::uuid
UNION ALL
SELECT 
  'ccccdddd-7777-7777-7777-777777777777'::uuid,
  'aaaabbbb-2222-2222-2222-222222222222'::uuid
UNION ALL
SELECT 
  'ccccdddd-8888-8888-8888-888888888888'::uuid,
  'aaaabbbb-3333-3333-3333-333333333333'::uuid
UNION ALL
SELECT 
  'ccccdddd-9999-9999-9999-999999999999'::uuid,
  'aaaabbbb-4444-4444-4444-444444444444'::uuid;
