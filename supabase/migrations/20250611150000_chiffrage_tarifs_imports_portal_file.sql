-- Link tarif imports to portal_files; drop redundant filename column.

ALTER TABLE public.chiffrage_tarifs_imports
  ADD COLUMN portal_file_id uuid REFERENCES public.portal_files(id) ON DELETE SET NULL;

UPDATE public.chiffrage_tarifs_imports ti
SET portal_file_id = pf.id
FROM public.portal_files pf
WHERE pf.bucket = 'chiffrage'
  AND pf.entity_type = 'tarif_import'
  AND pf.entity_id = ti.id::text;

ALTER TABLE public.chiffrage_tarifs_imports
  DROP COLUMN filename;

CREATE INDEX chiffrage_tarifs_imports_portal_file_id_idx
  ON public.chiffrage_tarifs_imports (portal_file_id);
