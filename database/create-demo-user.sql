-- Create demo user for portfolio demonstration
-- This script should be run in the Supabase SQL Editor

-- First, create the auth user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'testuser1@cipherchat.demo',
  crypt('Testuser1', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"username": "Testuser1", "avatar": "https://ui-avatars.com/api/?name=Testuser1&background=28a745&color=fff&size=80"}'
);

-- Then create the corresponding user profile
-- Note: This assumes the trigger is set up to create the profile automatically
-- If not, you may need to manually insert into the users table

-- Alternative: Create user profile manually if trigger doesn't work
INSERT INTO public.users (
  id,
  username,
  email,
  avatar,
  online_status,
  last_seen,
  contacts,
  settings,
  encryption_key,
  created_at,
  updated_at
) 
SELECT 
  id,
  'Testuser1',
  'testuser1@cipherchat.demo',
  'https://ui-avatars.com/api/?name=Testuser1&background=28a745&color=fff&size=80',
  'offline',
  NOW(),
  '[]'::jsonb,
  '{"notifications": true, "soundEnabled": true, "theme": "dark", "language": "en"}'::jsonb,
  '',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'testuser1@cipherchat.demo'
AND NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'testuser1@cipherchat.demo'
);

-- Verify the user was created
SELECT 
  u.id,
  u.username,
  u.email,
  u.created_at
FROM public.users u
WHERE u.email = 'testuser1@cipherchat.demo';
