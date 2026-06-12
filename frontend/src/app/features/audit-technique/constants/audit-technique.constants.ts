import type { CorpsMetier, EcartType } from '../audit-technique.models';

export const ECARTS: Array<{ value: EcartType; label: string; color: string }> = [
  { value: 'urgent', label: 'Écart urgent', color: '#b8453d' },
  { value: 'mineur', label: 'Écart mineur', color: '#c98f37' },
  { value: 'corrige', label: 'Corrigé ✓', color: '#2f8557' },
  { value: 'conseil', label: 'Conseil', color: '#3d6b8a' },
  { value: 'nvu', label: 'Non vu', color: '#8a948c' },
];

export const RECTIF_STATUS = [
  { value: 'en_attente', label: 'En attente', color: '#c98f37' },
  { value: 'en_cours', label: 'En cours', color: '#3d6b8a' },
  { value: 'corrige', label: 'Corrigé', color: '#2f8557' },
  { value: 'reporte', label: 'Reporté', color: '#8a948c' },
] as const;

export function createEmptyCorps(catalog: Pick<CorpsMetier, 'id' | 'code' | 'label'>[]): CorpsMetier[] {
  return catalog.map((cm) => ({
    id: cm.id,
    code: cm.code,
    label: cm.label,
    note: null,
    ecart: null,
    commentaire: '',
    photos: [],
    rectifStatus: 'en_attente',
    rectifNote: '',
  }));
}

export const NEW_AUDIT_STEPS = ['Informations générales', 'Évaluation corps de métier', 'Résumé & validation'] as const;
