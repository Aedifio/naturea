-- Drop redundant audit_technique_agencies bridge; point audits directly at agencies.

UPDATE public.audit_technique_audits ata
SET agence_id = bridge.agency_id
FROM public.audit_technique_agencies bridge
WHERE bridge.id = ata.agence_id
  AND bridge.agency_id IS NOT NULL
  AND ata.agence_id IS DISTINCT FROM bridge.agency_id;

ALTER TABLE public.audit_technique_audits
  DROP CONSTRAINT IF EXISTS audit_technique_audits_agence_id_fkey;

ALTER TABLE public.audit_technique_audits
  ADD CONSTRAINT audit_technique_audits_agence_id_fkey
  FOREIGN KEY (agence_id) REFERENCES public.agencies(id) ON DELETE RESTRICT;

DROP TRIGGER IF EXISTS agencies_sync_audit_technique ON public.agencies;

DROP FUNCTION IF EXISTS public.sync_audit_technique_agency_from_agency();

DROP POLICY IF EXISTS authenticated_all_audit_technique_agencies ON public.audit_technique_agencies;

DROP TABLE IF EXISTS public.audit_technique_agencies;
