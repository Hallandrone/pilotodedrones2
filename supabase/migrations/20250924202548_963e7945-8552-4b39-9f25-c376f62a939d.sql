-- Update phone numbers to Chilean format (+56)
UPDATE public.pilots SET phone = '+56 9 1234 5678' WHERE user_id = '550e8400-e29b-41d4-a716-446655440001'; -- Ana García López
UPDATE public.pilots SET phone = '+56 9 8765 4321' WHERE user_id = '550e8400-e29b-41d4-a716-446655440003'; -- María Fernández
UPDATE public.pilots SET phone = '+56 9 2468 1357' WHERE user_id = '550e8400-e29b-41d4-a716-446655440005'; -- Roberto Silva Martín
UPDATE public.pilots SET phone = '+56 9 1111 2222' WHERE user_id = '550e8400-e29b-41d4-a716-446655440007'; -- Juan Pérez
UPDATE public.pilots SET phone = '+56 9 3333 4444' WHERE user_id = '550e8400-e29b-41d4-a716-446655440008'; -- María González
UPDATE public.pilots SET phone = '+56 9 5555 6666' WHERE user_id = '550e8400-e29b-41d4-a716-446655440009'; -- Pedro Ramírez

-- Update service prices to Chilean pesos (CLP) - converting EUR to CLP (approximately 1 EUR = 1000 CLP)
-- Ana García López services
UPDATE public.pilot_services SET price_per_hour = 85000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440001' AND service_type = 'Fotografía Aérea';
UPDATE public.pilot_services SET price_per_hour = 120000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440001' AND service_type = 'Inspecciones Técnicas';
UPDATE public.pilot_services SET price_per_hour = 150000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440001' AND service_type = 'Topografía y Cartografía';

-- María Fernández services
UPDATE public.pilot_services SET price_per_hour = 95000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440002' AND service_type = 'Agricultura de Precisión';
UPDATE public.pilot_services SET price_per_hour = 110000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440002' AND service_type = 'Vigilancia y Seguridad';

-- Roberto Silva Martín services
UPDATE public.pilot_services SET price_per_hour = 200000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440003' AND service_type = 'Filmación Cinematográfica';
UPDATE public.pilot_services SET price_per_hour = 180000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440003' AND service_type = 'Búsqueda y Rescate';
UPDATE public.pilot_services SET price_per_hour = 130000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440003' AND service_type = 'Eventos Deportivos';
UPDATE public.pilot_services SET price_per_hour = 160000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440003' AND service_type = 'Modelado 3D';

-- Juan Pérez services
UPDATE public.pilot_services SET price_per_hour = 90000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440005' AND service_type = 'Fotografía Aérea';
UPDATE public.pilot_services SET price_per_hour = 110000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440005' AND service_type = 'Video para Eventos';

-- María González services
UPDATE public.pilot_services SET price_per_hour = 135000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440006' AND service_type = 'Inspecciones Técnicas';
UPDATE public.pilot_services SET price_per_hour = 155000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440006' AND service_type = 'Topografía';

-- Pedro Ramírez services
UPDATE public.pilot_services SET price_per_hour = 100000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440007' AND service_type = 'Agricultura de Precisión';
UPDATE public.pilot_services SET price_per_hour = 120000 WHERE pilot_id = '750e8400-e29b-41d4-a716-446655440007' AND service_type = 'Monitoreo Territorial';