-- Expose auth.users.last_sign_in_at in admin user list.

DROP FUNCTION IF EXISTS public.list_portal_users_admin();

CREATE OR REPLACE FUNCTION public.list_portal_users_admin()
RETURNS TABLE(
  id uuid,
  legacy_id integer,
  auth_user_id uuid,
  email text,
  name text,
  role text,
  franchise text,
  actif boolean,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, auth
AS $$
  SELECT
    pu.id,
    pu.legacy_id,
    pu.auth_user_id,
    au.email,
    pu.name,
    pu.role,
    pu.franchise,
    pu.actif,
    au.last_sign_in_at
  FROM public.portal_users pu
  LEFT JOIN auth.users au ON au.id = pu.auth_user_id
  WHERE public.is_portal_animateur()
  ORDER BY pu.legacy_id NULLS LAST, pu.name;
$$;

GRANT EXECUTE ON FUNCTION public.list_portal_users_admin() TO authenticated;
