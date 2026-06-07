import type { Agency, AuditCommerceState } from '../audit-commerce.models';
import { todayYM } from '../utils/audit-commerce.utils';

const ym = todayYM();

function mkRows(
  empId: string,
  vals: Record<string, number>,
  note?: number,
): { rows: Array<{ id: string; empId: string; val?: number; note?: number; vals?: Record<string, number> }> } {
  return {
    rows: [{ id: `r-${empId}-${Math.random().toString(36).slice(2, 6)}`, empId, ...vals, note }],
  };
}

function mkAudit(
  id: string,
  date: string,
  status: 'draft' | 'validated' | 'archived',
  empId: string,
  data: {
    entrant: number;
    traite: number;
    relance: number;
    r1: number;
    r2: number;
    r3: number;
    signRdv: number;
    signatures: number;
    ccmi: number;
    note: number;
  },
): import('../audit-commerce.models').Audit {
  return {
    id,
    date,
    status,
    empRatings: {},
    note: '',
    leaves: {
      'cli.contact.entrant': mkRows(empId, { val: data.entrant }, data.note - 0.5),
      'cli.contact.traite': mkRows(empId, { val: data.traite }, data.note),
      'cli.contact.relance': mkRows(empId, { val: data.relance }, data.note - 1),
      'cli.contact.rdv': {
        rows: [
          {
            id: `rdv-${id}`,
            empId,
            vals: { r1: data.r1, r2: data.r2, r3: data.r3, sign: data.signRdv },
            note: data.note,
            comment: '',
          },
        ],
      },
      'cli.signatures': mkRows(empId, { val: data.signatures }, data.note),
      'cli.ccmi': mkRows(empId, { val: data.ccmi }, data.note - 0.5),
      'cli.fiche': {
        rows: [{ id: `qf-${id}`, empId, note: data.note, comment: 'Bonne découverte client' }],
      },
      'mkt.annonce': mkRows(empId, { val: 2 }, data.note),
      'mkt.appreciation': { text: 'Marketing actif sur les réseaux', note: '' },
    },
  };
}

const agencies: Agency[] = [
  {
    id: 'ag-lyon',
    name: 'Agence Lyon',
    address: '12 rue de la Part-Dieu, Lyon',
    employees: [
      { id: 'e-lyon-1', name: 'Pierre Martin', role: 'Commercial' },
      { id: 'e-lyon-2', name: 'Julie Leroy', role: 'Conductrice de travaux' },
    ],
    objectives: { signatures: 8, ccmi: 2, transfo: 25 },
    documents: [],
    audits: [
      mkAudit('au-lyon-v', `${ym}-08`, 'validated', 'e-lyon-1', {
        entrant: 42,
        traite: 28,
        relance: 6,
        r1: 12,
        r2: 5,
        r3: 2,
        signRdv: 3,
        signatures: 5,
        ccmi: 1,
        note: 7.5,
      }),
      mkAudit('au-lyon-d', `${ym}-18`, 'draft', 'e-lyon-2', {
        entrant: 18,
        traite: 10,
        relance: 3,
        r1: 4,
        r2: 1,
        r3: 0,
        signRdv: 1,
        signatures: 2,
        ccmi: 0,
        note: 6,
      }),
    ],
  },
  {
    id: 'ag-bdx',
    name: 'Agence Bordeaux',
    address: '5 cours de l Intendance, Bordeaux',
    employees: [{ id: 'e-bdx-1', name: 'Sophie Dupont', role: 'Commercial' }],
    objectives: { signatures: 6, ccmi: 1, transfo: 22 },
    documents: [],
    audits: [
      mkAudit('au-bdx-v', `${ym}-12`, 'validated', 'e-bdx-1', {
        entrant: 35,
        traite: 20,
        relance: 8,
        r1: 8,
        r2: 3,
        r3: 1,
        signRdv: 2,
        signatures: 4,
        ccmi: 1,
        note: 6.8,
      }),
    ],
  },
  {
    id: 'ag-lil',
    name: 'Agence Lille',
    address: '22 rue Faidherbe, Lille',
    employees: [
      { id: 'e-lil-1', name: 'Marc Bernard', role: 'Commercial' },
      { id: 'e-lil-2', name: 'Nadia Khelifi', role: 'Assistante commerciale' },
    ],
    objectives: { signatures: 5, ccmi: 2, transfo: 20 },
    documents: [],
    audits: [
      mkAudit('au-lil-v', `${ym}-06`, 'validated', 'e-lil-1', {
        entrant: 28,
        traite: 12,
        relance: 10,
        r1: 5,
        r2: 2,
        r3: 0,
        signRdv: 1,
        signatures: 2,
        ccmi: 2,
        note: 4.2,
      }),
      mkAudit('au-lil-a', `${ym}-20`, 'archived', 'e-lil-2', {
        entrant: 15,
        traite: 8,
        relance: 4,
        r1: 3,
        r2: 0,
        r3: 0,
        signRdv: 0,
        signatures: 1,
        ccmi: 0,
        note: 5.5,
      }),
    ],
  },
  {
    id: 'ag-nce',
    name: 'Agence Nice',
    address: '8 avenue Jean Médecin, Nice',
    employees: [{ id: 'e-nce-1', name: 'Thomas Roux', role: 'Commercial' }],
    objectives: { signatures: 7 },
    documents: [],
    audits: [],
  },
];

export const AUDIT_COMMERCE_SEED: AuditCommerceState = {
  version: 2,
  settings: { threshold: 0.8, noteThreshold: 5 },
  agencies,
};
