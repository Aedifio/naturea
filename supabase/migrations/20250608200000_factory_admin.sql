-- Admin RPCs for factory CRUD (Animateur only).

CREATE OR REPLACE FUNCTION public.list_factories_admin()
RETURNS SETOF public.factory
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.*
  FROM public.factory f
  WHERE public.is_portal_animateur()
  ORDER BY f.nom;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_factory(
  p_key text,
  p_nom text,
  p_couleur text,
  p_description text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_actif boolean DEFAULT true
)
RETURNS public.factory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_row public.factory;
BEGIN
  IF NOT public.is_portal_animateur() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  v_key := lower(trim(p_key));
  IF v_key = '' OR v_key !~ '^[a-z][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid key: use lowercase letters, digits and underscores (e.g. boisboreal)';
  END IF;

  IF trim(p_nom) = '' THEN
    RAISE EXCEPTION 'Nom required';
  END IF;

  IF trim(p_couleur) = '' OR trim(p_couleur) !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Invalid couleur: use hex format #RRGGBB';
  END IF;

  IF p_contact_email IS NOT NULL AND trim(p_contact_email) <> ''
     AND trim(p_contact_email) !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  INSERT INTO public.factory (key, nom, couleur, description, contact_email, actif)
  VALUES (
    v_key,
    trim(p_nom),
    trim(p_couleur),
    nullif(trim(p_description), ''),
    nullif(trim(p_contact_email), ''),
    COALESCE(p_actif, true)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_factory(
  p_id integer,
  p_nom text,
  p_couleur text,
  p_description text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_actif boolean DEFAULT true
)
RETURNS public.factory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.factory;
BEGIN
  IF NOT public.is_portal_animateur() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF trim(p_nom) = '' THEN
    RAISE EXCEPTION 'Nom required';
  END IF;

  IF trim(p_couleur) = '' OR trim(p_couleur) !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Invalid couleur: use hex format #RRGGBB';
  END IF;

  IF p_contact_email IS NOT NULL AND trim(p_contact_email) <> ''
     AND trim(p_contact_email) !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  UPDATE public.factory
  SET
    nom = trim(p_nom),
    couleur = trim(p_couleur),
    description = nullif(trim(p_description), ''),
    contact_email = nullif(trim(p_contact_email), ''),
    actif = COALESCE(p_actif, true)
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Factory not found';
  END IF;

  RETURN v_row;
END;
$$;
