-- Fix has_role(): the parameter `role` collided with the profiles.role
-- column, so every RLS policy calling has_role() failed with PG 42702
-- (column reference "role" is ambiguous). Qualify the variables with the
-- function name to disambiguate. Signature unchanged, drop-in safe.
CREATE OR REPLACE FUNCTION public.has_role(uid UUID, role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = has_role.uid
      AND profiles.role = has_role.role::app_role
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
