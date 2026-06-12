import { AppCode, PermissionLevel } from './user.model';

export type RolePermissions = Partial<Record<AppCode, PermissionLevel>>;

export const APPS_META = [
  {
    code: 'PORTAIL' as AppCode,
    name: 'Portail',
    navLabel: 'Portail',
    navClass: 'a-portail',
    icon: '🏠',
    className: 't-portail',
    desc: "Page d'accueil du portail (actus, agenda, applications).",
    route: '/home',
    hideFromNav: true,
  },
  { code: 'RESEAU' as AppCode, name: 'Réseau', navLabel: 'Réseau', navClass: 'a-reseau', icon: '📊', className: 't-recrut', desc: "Vue d'ensemble du réseau : audits, formations, communications, agenda.", route: '/reseau', kpiPublic: false },
  { code: 'CODIR' as AppCode, name: 'Codir', navLabel: 'Codir', navClass: 'a-codir', icon: '📈', className: 't-codir', desc: "Pilotage exécutif. Plan d'actions, suivi des décisions.", route: '/apps/codir' },
  { code: 'RECRUT' as AppCode, name: 'Recrutement Franchise', navLabel: 'Recrutement', navClass: 'a1', icon: '🤝', className: 't-recrut', desc: 'Pipeline candidats franchisés.', route: '/apps/recrutement' },
  { code: 'OSSATURE' as AppCode, name: 'OssatureTrack', navLabel: 'Ossature', navClass: 'a2', icon: '🏗️', className: 't-ossature', desc: 'Suivi fabrication ossatures bois.', route: '/apps/ossature' },
  { code: 'AUDIT' as AppCode, name: 'Audit technique', navLabel: 'Audit technique', navClass: 'a3', icon: '📋', className: 't-audit', desc: 'Contrôle qualité chantier sur site.', route: '/apps/audit-technique', kpiPublic: true },
  { code: 'AUDIT_COM' as AppCode, name: 'Audit commerce', navLabel: 'Audit commerce', navClass: 'a3', icon: '🗂️', className: 't-audit', desc: 'Suivi commercial des franchises.', route: '/apps/audit-commerce', kpiPublic: true },
  { code: 'CHIFFRAGE' as AppCode, name: 'Chiffrage Naturéa', navLabel: 'Chiffrage', navClass: 'a5', icon: '💰', className: 't-chiffrage', desc: 'Estimateur multi-usines pour devis client.', route: '/apps/chiffrage' },
  { code: 'ADMIN' as AppCode, name: 'Administration', navLabel: 'Admin', navClass: 'a-admin', icon: '⚙️', className: 't-audit', desc: 'Gestion des utilisateurs et des permissions.', route: '/admin' },
];
