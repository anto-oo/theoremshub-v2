-- ============================================================================
-- Seed data for Slice 2: Auth & RBAC, Members, Profile
-- Adds seed profiles with the correct 4 roles and member numbers.
-- ============================================================================

-- Update existing seed profiles with correct roles and member numbers
INSERT INTO public.profiles (id, email, full_name, role, auth_id, first_name, last_name, classe, username, member_number)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@theoremshub.test', 'Admin User', 'admin', '00000000-0000-0000-0000-000000000001', 'Admin', 'User', 'CS101', 'admin', 1),
  ('00000000-0000-0000-0000-000000000002', 'manager@theoremshub.test', 'Manager User', 'manager', '00000000-0000-0000-0000-000000000002', 'Manager', 'User', 'CS102', 'manager', 2),
  ('00000000-0000-0000-0000-000000000003', 'user@theoremshub.test', 'Regular User', 'user', '00000000-0000-0000-0000-000000000003', 'Regular', 'User', 'CS103', 'user', 3);

-- Ensure candidate role seed exists
INSERT INTO public.profiles (id, email, full_name, role, auth_id, first_name, last_name, classe, username, member_number)
VALUES
  ('00000000-0000-0000-0000-000000000004', 'candidate@theoremshub.test', 'Candidate User', 'candidate', '00000000-0000-0000-0000-000000000004', 'Candidate', 'User', 'CS104', 'candidate', 4)
ON CONFLICT (id) DO NOTHING;
