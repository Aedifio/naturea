import type { AuditTechniqueState } from '../audit-technique.models';
import { createEmptyCorps } from './audit-technique.constants';
import auditAgencesDef from '../../../core/data/audit-agences-def.json';

function corpsWithNotes(
  entries: Array<{ id: number; note: number | null; ecart?: string | null; commentaire?: string; rectifStatus?: string; rectifNote?: string }>,
) {
  const base = createEmptyCorps();
  return base.map((c) => {
    const e = entries.find((x) => x.id === c.id);
    if (!e) return c;
    return {
      ...c,
      note: e.note,
      ecart: (e.ecart as typeof c.ecart) ?? null,
      commentaire: e.commentaire ?? '',
      rectifStatus: (e.rectifStatus as typeof c.rectifStatus) ?? 'en_attente',
      rectifNote: e.rectifNote ?? '',
    };
  });
}

export const AUDIT_TECHNIQUE_SEED: AuditTechniqueState = {
  agences: (auditAgencesDef as Array<{ id: number; nom: string; ville: string; adresse: string }>).map((a) => ({
    ...a,
    audits: [],
  })),
};

const boisilia = AUDIT_TECHNIQUE_SEED.agences.find((a) => a.id === 1)!;
boisilia.audits = [
  {
    id: 1001,
    date: '2026-05-15',
    auditeur: 'Marc Durand — Coordinateur Qualité',
    chantiers: 'Résidence Les Chênes — Villefranche',
    participants: 'Gérant BOISILIA, chef de chantier',
    commentaires: 'Chantier globalement bien tenu. Quelques points MOB à corriger rapidement.',
    corps: corpsWithNotes([
      { id: 1, note: 4, ecart: 'conseil' },
      { id: 2, note: 4, ecart: null },
      { id: 3, note: 2, ecart: 'urgent', commentaire: 'Fixations MOB non conformes sur 3 montants', rectifStatus: 'en_attente' },
      { id: 4, note: 3, ecart: 'mineur' },
      { id: 5, note: 4, ecart: null },
      { id: 6, note: 3, ecart: 'mineur' },
      { id: 9, note: 4, ecart: null },
      { id: 13, note: 3, ecart: 'conseil' },
    ]),
  },
  {
    id: 1002,
    date: '2026-03-20',
    auditeur: 'Marc Durand',
    chantiers: 'Maison individuelle — Gleizé',
    participants: 'Gérant, conducteur de travaux',
    commentaires: 'Bonne progression. Documentation à jour.',
    corps: corpsWithNotes([
      { id: 1, note: 4, ecart: null },
      { id: 3, note: 4, ecart: null },
      { id: 6, note: 3, ecart: 'mineur', rectifStatus: 'corrige' },
      { id: 9, note: 4, ecart: null },
      { id: 13, note: 4, ecart: null },
    ]),
  },
];

const tarn = AUDIT_TECHNIQUE_SEED.agences.find((a) => a.id === 2)!;
tarn.audits = [
  {
    id: 2001,
    date: '2026-04-10',
    auditeur: 'Sophie Martin',
    chantiers: 'Lotissement Le Parc — Albi',
    participants: 'Direction TARN MOB',
    commentaires: 'Audit de suivi positif.',
    corps: corpsWithNotes([
      { id: 1, note: 4, ecart: null },
      { id: 3, note: 3, ecart: 'mineur' },
      { id: 6, note: 4, ecart: null },
      { id: 8, note: 3, ecart: 'urgent', commentaire: 'Calfeutrement menuiseries à reprendre', rectifStatus: 'en_cours', rectifNote: 'Intervention prévue 20/05' },
      { id: 13, note: 4, ecart: null },
    ]),
  },
];

const gpmeob = AUDIT_TECHNIQUE_SEED.agences.find((a) => a.id === 3)!;
gpmeob.audits = [
  {
    id: 3001,
    date: '2026-05-02',
    auditeur: 'Marc Durand',
    chantiers: 'Villa contemporaine — Annecy-le-Vieux',
    participants: 'GP-MEOB équipe terrain',
    commentaires: 'Excellente organisation de chantier.',
    corps: corpsWithNotes([
      { id: 1, note: 5, ecart: null },
      { id: 3, note: 4, ecart: null },
      { id: 5, note: 4, ecart: 'conseil' },
      { id: 6, note: 4, ecart: null },
      { id: 9, note: 5, ecart: null },
      { id: 13, note: 4, ecart: null },
    ]),
  },
];

const acvr = AUDIT_TECHNIQUE_SEED.agences.find((a) => a.id === 7)!;
acvr.audits = [
  {
    id: 7001,
    date: '2026-02-18',
    auditeur: 'Sophie Martin',
    chantiers: 'Maison RT2012 — Caen',
    participants: 'ACVR HOME',
    commentaires: 'Points ventilation à surveiller.',
    corps: corpsWithNotes([
      { id: 3, note: 3, ecart: 'mineur' },
      { id: 10, note: 2, ecart: 'urgent', commentaire: 'VMC non conforme — reprise nécessaire', rectifStatus: 'corrige', rectifNote: 'Corrigé le 05/03' },
      { id: 13, note: 3, ecart: 'mineur' },
    ]),
  },
];
