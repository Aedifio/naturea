-- Admin RPC: set/reset a portal user's login password (Animateur only).
-- Mirrors the auth-account handling used by admin_create_portal_user.

CREATE OR REPLACE FUNCTION public.admin_set_portal_user_password(
  p_portal_user_id uuid,
  p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  IF NOT public.is_portal_animateur() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  SELECT auth_user_id INTO v_auth_user_id
  FROM public.portal_users
  WHERE id = p_portal_user_id;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User has no linked auth account';
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
    updated_at = now()
  WHERE id = v_auth_user_id;
END;
$$;
