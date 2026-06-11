-- Link ossature order documents to portal_files (storage + metadata).

CREATE TABLE public.ossature_order_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.ossature_orders(id) ON DELETE CASCADE,
  portal_file_id uuid NOT NULL REFERENCES public.portal_files(id) ON DELETE CASCADE,
  kind text NOT NULL,
  slot text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ossature_order_files_portal_file_id_key UNIQUE (portal_file_id),
  CONSTRAINT ossature_order_files_order_kind_slot_key UNIQUE (order_id, kind, slot)
);

CREATE INDEX ossature_order_files_order_id_idx ON public.ossature_order_files (order_id);

ALTER TABLE public.ossature_order_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_all_ossature_order_files ON public.ossature_order_files
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
