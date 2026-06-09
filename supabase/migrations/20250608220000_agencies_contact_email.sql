-- Add contact_email to agencies and extend admin RPCs.

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

UPDATE public.agencies SET contact_email = 'contact@tarn-mob.fr' WHERE name ILIKE 'TARN MAISON OSSATURE BOIS%';
UPDATE public.agencies SET contact_email = 'contact@gp-meob.fr' WHERE name = 'GP-MEOB';
UPDATE public.agencies SET contact_email = 'contact@lbros.fr' WHERE name = 'SARL LBROS';
UPDATE public.agencies SET contact_email = 'contact@ecohome84.fr' WHERE name = 'ECOHOME 84';
UPDATE public.agencies SET contact_email = 'contact@bugey-bresse.fr' WHERE name = 'BUGEY BRESSE CONSTRUCTIONS';
UPDATE public.agencies SET contact_email = 'contact@acvr-home.fr' WHERE name = 'ACVR HOME';
UPDATE public.agencies SET contact_email = 'contact@ldpca.fr' WHERE name = 'LDPCA CONSTRUCTIONS';
UPDATE public.agencies SET contact_email = 'contact@ema-construction.fr' WHERE name = 'E.M.A CONSTRUCTION';
UPDATE public.agencies SET contact_email = 'contact@mgce.fr' WHERE name = 'MGCE';
UPDATE public.agencies SET contact_email = 'contact@cabinet-apj.fr' WHERE name = 'CABINET APJ';
UPDATE public.agencies SET contact_email = 'contact@bertrand-constructions.fr' WHERE name = 'SAS BERTRAND CONSTRUCTIONS';
UPDATE public.agencies SET contact_email = 'contact@ob-concept.fr' WHERE name = 'OB CONCEPT';
UPDATE public.agencies SET contact_email = 'contact@evabois.fr' WHERE name = 'EVABOIS';
UPDATE public.agencies SET contact_email = 'contact@nati-bretagne.fr' WHERE name = 'NATI BRETAGNE NORD';
UPDATE public.agencies SET contact_email = 'contact@nogot-concept.fr' WHERE name = 'NOGOT CONCEPT';
UPDATE public.agencies SET contact_email = 'contact@mo2b.fr' WHERE name ILIKE 'MO2B%';
UPDATE public.agencies SET contact_email = 'contact@boisilia.fr' WHERE name = 'BOISILIA CONSTRUCTION';
UPDATE public.agencies SET contact_email = 'denis.blokus@gmail.com' WHERE name ILIKE '%TEST%';

CREATE OR REPLACE FUNCTION public.admin_create_agency(
  p_name text,
  p_ville text DEFAULT NULL,
  p_adresse text DEFAULT NULL,
  p_contact_email text DEFAULT NULL
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

  IF p_contact_email IS NOT NULL AND trim(p_contact_email) <> ''
     AND trim(p_contact_email) !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  INSERT INTO public.agencies (name, ville, adresse, slug, contact_email)
  VALUES (
    v_name,
    nullif(trim(p_ville), ''),
    nullif(trim(p_adresse), ''),
    public.agency_slug_from_name(v_name),
    nullif(trim(p_contact_email), '')
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_agency(
  p_id integer,
  p_name text,
  p_ville text DEFAULT NULL,
  p_adresse text DEFAULT NULL,
  p_contact_email text DEFAULT NULL
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

  IF p_contact_email IS NOT NULL AND trim(p_contact_email) <> ''
     AND trim(p_contact_email) !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  UPDATE public.agencies
  SET
    name = v_name,
    ville = nullif(trim(p_ville), ''),
    adresse = nullif(trim(p_adresse), ''),
    slug = public.agency_slug_from_name(v_name),
    contact_email = nullif(trim(p_contact_email), ''),
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  RETURN v_row;
END;
$$;
