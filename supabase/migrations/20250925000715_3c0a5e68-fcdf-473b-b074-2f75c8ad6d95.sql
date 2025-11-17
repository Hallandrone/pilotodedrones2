-- Delete user profiles and related data for the specified users
DELETE FROM public.user_roles WHERE id IN (
  '96bbe0e3-ee6e-49a9-9540-ff3d7569a352',
  'e4f1ee6d-81ac-403e-bd2a-d5376baa14f5', 
  '0c697ca0-f61d-4b2b-99c2-c0337df90437'
);

DELETE FROM public.profiles WHERE id IN (
  '96bbe0e3-ee6e-49a9-9540-ff3d7569a352',
  'e4f1ee6d-81ac-403e-bd2a-d5376baa14f5',
  '0c697ca0-f61d-4b2b-99c2-c0337df90437'
);

-- Delete from auth.users table (requires service role privileges)
DELETE FROM auth.users WHERE id IN (
  '96bbe0e3-ee6e-49a9-9540-ff3d7569a352',
  'e4f1ee6d-81ac-403e-bd2a-d5376baa14f5',
  '0c697ca0-f61d-4b2b-99c2-c0337df90437'
);