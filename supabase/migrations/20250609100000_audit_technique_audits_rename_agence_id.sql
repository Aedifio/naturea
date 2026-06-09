-- Rename audit_technique_audits.agence_id → agency_id (canonical naming).

ALTER TABLE public.audit_technique_audits
  DROP CONSTRAINT IF EXISTS audit_technique_audits_agence_id_fkey;

ALTER TABLE public.audit_technique_audits
  RENAME COLUMN agence_id TO agency_id;

ALTER TABLE public.audit_technique_audits
  ADD CONSTRAINT audit_technique_audits_agency_id_fkey
  FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE RESTRICT;
