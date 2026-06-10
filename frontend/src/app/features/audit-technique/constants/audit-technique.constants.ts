import type { CorpsMetier, EcartType } from '../audit-technique.models';

export const CORPS = [
  { id: 1, code: '01', label: 'Implantation / Terrassement' },
  { id: 2, code: '02', label: 'Maçonnerie Infrastructure' },
  { id: 3, code: '03', label: 'MOB (Murs Ossature Bois)' },
  { id: 4, code: '04', label: 'Fermettes Industrielles' },
  { id: 5, code: '05', label: 'Charpente Trad. & Bois Ext.' },
  { id: 6, code: '06', label: 'Couverture / Zinguerie' },
  { id: 7, code: '07', label: 'Fumisterie' },
  { id: 8, code: '08', label: 'Menuiseries Extérieures' },
  { id: 9, code: '09', label: 'Plâtrerie / Isolation' },
  { id: 10, code: '10', label: 'Ventilation' },
  { id: 11, code: '11', label: 'Menuiseries Intérieures' },
  { id: 12, code: '12', label: 'Carrelages / Faïences' },
  { id: 13, code: '13', label: 'Plomberie / Chauffage / Élec.' },
  { id: 14, code: '14', label: 'ECTIS / Ravalement' },
  { id: 15, code: '15', label: 'Branchements / Assainissement' },
  { id: 16, code: '16', label: 'Conception Générale & Divers' },
] as const;

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

export function createEmptyCorps(): CorpsMetier[] {
  return CORPS.map((cm) => ({
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
