-- Drop unused agencies.legacy_id and auto-provision audit_technique bridge rows.

ALTER TABLE public.agencies DROP COLUMN IF EXISTS legacy_id;

CREATE OR REPLACE FUNCTION public.sync_audit_technique_agency_from_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.audit_technique_agencies ata WHERE ata.agency_id = NEW.id
  ) THEN
    INSERT INTO public.audit_technique_agencies (agency_id, nom, ville, adresse)
    VALUES (NEW.id, NEW.name, NEW.ville, NEW.adresse);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agencies_sync_audit_technique ON public.agencies;

CREATE TRIGGER agencies_sync_audit_technique
  AFTER INSERT ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_audit_technique_agency_from_agency();

-- Backfill any agency missing a bridge row (e.g. created before trigger).
INSERT INTO public.audit_technique_agencies (agency_id, nom, ville, adresse)
SELECT a.id, a.name, a.ville, a.adresse
FROM public.agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_technique_agencies ata WHERE ata.agency_id = a.id
);
