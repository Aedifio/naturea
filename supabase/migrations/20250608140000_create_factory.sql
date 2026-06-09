-- Central usine metadata (chiffrage + ossature). Postes/tarifs stay in app constants for now.

CREATE TABLE IF NOT EXISTS public.factory (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  couleur TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS factory_key_idx ON public.factory (key);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS factory_updated_at ON public.factory;
CREATE TRIGGER factory_updated_at
  BEFORE UPDATE ON public.factory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.factory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS factory_select_authenticated ON public.factory;
CREATE POLICY factory_select_authenticated
  ON public.factory
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.factory (key, nom, couleur, description, contact_email, updated_at)
VALUES
  ('boisboreal', 'BoisBoréal', '#2B4A1A', 'Fabricant Vendée — agences Ouest et Sud', 'contact@boisboreal.fr', '2026-04-29'::timestamptz),
  ('cobs', 'COBS / GIPEN', '#5A7A3A', 'Fabricant Savoie — agences Est et Sud-Est', 'contact@cobs.fr', '2026-03-06'::timestamptz),
  ('sicob', 'SICOB', '#8B4513', 'Charpentier-couvreur Aveyron (12240 Rieupeyroux) — agences Midi-Pyrénées, Occitanie, PACA', 'contact@sicob.fr', '2026-04-17'::timestamptz),
  ('imaj', 'IMAJ', '#1A5276', 'Fabricant MOB Lot-et-Garonne (47200 Marmande) — agences Sud-Ouest', 'jernout@imaj-bois.fr', '2026-03-04'::timestamptz),
  ('savare', 'SAVARE (Eiffage)', '#C0392B', 'Fabricant MOB Normandie (Lessay 50 / Moult 14) — agences Normandie, Grand Ouest, Nord', 'contact@savare.fr', '2025-04-08'::timestamptz),
  ('lowall', 'LOWALL', '#2E7D7D', 'Fabricant panneaux MOB Bouches-du-Rhône (Gardanne 13) — agences PACA. Pas de charpente.', 'contact@lowall.fr', '2026-05-11'::timestamptz)
ON CONFLICT (key) DO UPDATE SET
  nom = EXCLUDED.nom,
  couleur = EXCLUDED.couleur,
  description = EXCLUDED.description,
  contact_email = EXCLUDED.contact_email,
  updated_at = EXCLUDED.updated_at;
