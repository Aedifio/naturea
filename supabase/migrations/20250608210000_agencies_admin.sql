-- Admin RPCs for agency CRUD (Animateur only).

CREATE OR REPLACE FUNCTION public.agency_slug_from_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(
    trim(both '-' from lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'))),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.list_agencies_admin()
RETURNS SETOF public.agencies
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.*
  FROM public.agencies a
  WHERE public.is_portal_animateur()
  ORDER BY a.name;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_agency(
  p_name text,
  p_ville text DEFAULT NULL,
  p_adresse text DEFAULT NULL
)
RETURNS public.agencies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_row public.agencies;
BEGIN
  IF NOT public.is_portal_animateur() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  v_name := trim(p_name);
  IF v_name = '' THEN
    RAISE EXCEPTION 'Name required';
  END IF;

  INSERT INTO public.agencies (name, ville, adresse, slug)
  VALUES (
    v_name,
    nullif(trim(p_ville), ''),
    nullif(trim(p_adresse), ''),
    public.agency_slug_from_name(v_name)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_agency(
  p_id integer,
  p_name text,
  p_ville text DEFAULT NULL,
  p_adresse text DEFAULT NULL
)
RETURNS public.agencies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_row public.agencies;
BEGIN
  IF NOT public.is_portal_animateur() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  v_name := trim(p_name);
  IF v_name = '' THEN
    RAISE EXCEPTION 'Name required';
  END IF;

  UPDATE public.agencies
  SET
    name = v_name,
    ville = nullif(trim(p_ville), ''),
    adresse = nullif(trim(p_adresse), ''),
    slug = public.agency_slug_from_name(v_name),
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  RETURN v_row;
END;
$$;
