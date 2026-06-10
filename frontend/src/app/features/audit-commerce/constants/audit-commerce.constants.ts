import type { AuditTreeNode, LeafKind } from '../audit-commerce.models';

export const DOC_KEY_PREFIX = 'fnet:doc:';

export const AUDIT_TREE: AuditTreeNode[] = [
  {
    id: 'mkt',
    label: 'Marketing',
    children: [
      { id: 'mkt.annonce', label: 'Annonce', kind: 'num', hint: "Nb d'annonces mises en ligne" },
      { id: 'mkt.rs', label: 'Réseaux sociaux', kind: 'num', hint: 'Nb de publications / mois' },
      {
        id: 'mkt.ac',
        label: 'Action commerciale',
        children: [
          { id: 'mkt.ac.po', label: 'Portes ouvertes (PO)', kind: 'num', hint: 'Nb de portes ouvertes organisées' },
          { id: 'mkt.ac.panneau', label: 'Panneautage', kind: 'num', hint: 'Nb de panneaux posés' },
        ],
      },
      { id: 'mkt.avis', label: 'Avis client', kind: 'num', hint: "Nb d'avis recueillis" },
      {
        id: 'mkt.appreciation',
        label: 'Appréciation globale',
        kind: 'text',
        hint: "Appréciation générale du marketing de l'agence",
      },
    ],
  },
  {
    id: 'cli',
    label: 'Clientèle',
    children: [
      {
        id: 'cli.contact',
        label: 'Contacts mensuels',
        children: [
          { id: 'cli.contact.entrant', label: 'Contacts entrants', kind: 'num', kpi: 'entrant', hint: 'Nb de contacts entrants reçus' },
          { id: 'cli.contact.traite', label: 'Traités', kind: 'num', kpi: 'contacts', hint: 'Nb de contacts traités' },
          { id: 'cli.contact.relance', label: 'À relancer', kind: 'num', hint: 'Nb de contacts à relancer' },
          {
            id: 'cli.contact.rdv',
            label: 'RDV pris',
            kind: 'multi',
            kpi: 'rdv',
            hint: 'Par salarié : nb de R1, R2, R3 et signatures prises (RDV = R1+R2+R3)',
            cols: [
              { key: 'r1', label: 'R1' },
              { key: 'r2', label: 'R2' },
              { key: 'r3', label: 'R3' },
              { key: 'sign', label: 'Signature' },
            ],
          },
          {
            id: 'cli.contact.hs',
            label: 'Contacts HS',
            kind: 'calc',
            kpi: 'hs',
            hint: 'Calcul automatique : entrants − (traités + à relancer)',
          },
        ],
      },
      { id: 'cli.fiche', label: 'Fiche découverte', kind: 'qual', hint: 'Qualité de la découverte client, par salarié (commentaire + note)' },
      { id: 'cli.signatures', label: 'Signatures', kind: 'num', kpi: 'signatures', hint: 'Nb de signatures' },
      { id: 'cli.ccmi', label: 'Nombre de résiliations', kind: 'num', kpi: 'ccmi', hint: 'Nb de résiliations sur le mois' },
    ],
  },
  {
    id: 'dev',
    label: 'Développement',
    children: [
      {
        id: 'dev.foncier',
        label: 'Recherche foncière',
        children: [{ id: 'dev.foncier.terrain', label: 'Nouveaux terrains', kind: 'num', hint: 'Nb de nouveaux terrains sur le mois' }],
      },
      {
        id: 'dev.part',
        label: 'Partenaires',
        children: [{ id: 'dev.part.new', label: 'Nouveaux partenaires', kind: 'num', hint: 'Nb de nouveaux partenaires sur le mois' }],
      },
    ],
  },
];

export const LEAF_KIND: Record<string, LeafKind> = {};
export const LEAF_NODE: Record<string, AuditTreeNode> = {};
export const NUM_LEAVES: string[] = [];
export const MULTI_LEAVES: string[] = [];

(function walk(ns: AuditTreeNode[]) {
  ns.forEach((n) => {
    if (n.children) walk(n.children);
    else if (n.kind) {
      LEAF_KIND[n.id] = n.kind;
      LEAF_NODE[n.id] = n;
      if (n.kind === 'num') NUM_LEAVES.push(n.id);
      if (n.kind === 'multi') MULTI_LEAVES.push(n.id);
    }
  });
})(AUDIT_TREE);

export const RATIO_COLS: Array<[keyof import('../audit-commerce.models').RatioValues, string]> = [
  ['r_traite', 'Traités / entrants'],
  ['r_rdv', 'RDV / entrants'],
  ['r_sign', 'Signatures / entrants'],
  ['r_sign_r1', 'Signatures / R1'],
  ['r_resil', 'Résil. / signatures'],
  ['r_hs', 'HS / entrants'],
];

export const MONTH_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

export const MONTHS_FR_FULL = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
