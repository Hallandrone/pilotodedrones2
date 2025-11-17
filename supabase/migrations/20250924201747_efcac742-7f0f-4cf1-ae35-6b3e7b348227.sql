-- Delete 3 demo users and all related data

-- First delete pilot services for pilots we're removing
DELETE FROM public.pilot_services 
WHERE pilot_id IN (
  SELECT p.id FROM public.pilots p 
  WHERE p.user_id IN (
    '550e8400-e29b-41d4-a716-446655440002', -- Carlos Rodríguez
    '550e8400-e29b-41d4-a716-446655440004', -- Diego Morales
    '550e8400-e29b-41d4-a716-446655440006'  -- Carmen Delgado Torres
  )
);

-- Delete pilots records
DELETE FROM public.pilots 
WHERE user_id IN (
  '550e8400-e29b-41d4-a716-446655440002', -- Carlos Rodríguez
  '550e8400-e29b-41d4-a716-446655440004', -- Diego Morales  
  '550e8400-e29b-41d4-a716-446655440006'  -- Carmen Delgado Torres
);

-- Delete user roles
DELETE FROM public.user_roles 
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440002', -- Carlos Rodríguez
  '550e8400-e29b-41d4-a716-446655440004', -- Diego Morales
  '550e8400-e29b-41d4-a716-446655440006'  -- Carmen Delgado Torres
);

-- Finally delete profiles
DELETE FROM public.profiles 
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440002', -- Carlos Rodríguez
  '550e8400-e29b-41d4-a716-446655440004', -- Diego Morales
  '550e8400-e29b-41d4-a716-446655440006'  -- Carmen Delgado Torres
);