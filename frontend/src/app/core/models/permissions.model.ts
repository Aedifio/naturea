import { AppCode, PermissionLevel } from './user.model';

export type RolePermissions = Partial<Record<AppCode, PermissionLevel>>;

export const PERMS: Record<string, RolePermissions> = {
  Animateur: {
    RESEAU: 'ADMIN',
    CODIR: 'ADMIN',
    RECRUT: 'ADMIN',
    OSSATURE: 'ADMIN',
    AUDIT: 'ADMIN',
    AUDIT_COM: 'ADMIN',
    CHIFFRAGE: 'ADMIN',
    ADMIN: 'ADMIN',
  },
  Codir: {
    RESEAU: 'R',
    CODIR: 'RW',
    RECRUT: 'RW',
    OSSATURE: 'R',
    CHIFFRAGE: 'R',
  },
  Franchisé: {
    OSSATURE: 'RW',
    CHIFFRAGE: 'RW',
  },
  Commercial: {
    OSSATURE: 'R',
    CHIFFRAGE: 'RW',
  },
  'Conducteur travaux': {
    OSSATURE: 'RW',
    CHIFFRAGE: 'RW',
  },
  'Assistant·e admin': {
    OSSATURE: 'R',
    CHIFFRAGE: 'R',
  },
  'Dessinateur / BE': {
    OSSATURE: 'RW',
    CHIFFRAGE: 'RW',
  },
};

export const SEED_USERS = [
  { id: 1, email: 'animateur@maisons-naturea.fr', password: 'anim2026!', name: 'Animateur Réseau', role: 'Animateur', franchise: '(siège)', actif: true },
  { id: 2, email: 'directeur@maisons-naturea.fr', password: 'codir2026!', name: 'Marie Dubois', role: 'Codir', franchise: '(siège)', actif: true },
  { id: 3, email: 'test.franchise@naturea.fr', password: 'test2026!', name: 'Test Franchisé', role: 'Franchisé', franchise: 'Franchise A', actif: true },
  { id: 4, email: 'commercial.a@naturea.fr', password: 'comm2026!', name: 'Pierre Martin', role: 'Commercial', franchise: 'Franchise A', actif: true },
  { id: 5, email: 'conducteur.a@naturea.fr', password: 'cdt2026!', name: 'Julie Leroy', role: 'Conducteur travaux', franchise: 'Franchise A', actif: true },
  { id: 6, email: 'admin.a@naturea.fr', password: 'adm2026!', name: 'Sophie Petit', role: 'Assistant·e admin', franchise: 'Franchise A', actif: true },
  { id: 7, email: 'be.a@naturea.fr', password: 'be2026!', name: 'Lucas Bernard', role: 'Dessinateur / BE', franchise: 'Franchise A', actif: true },
  { id: 8, email: 'ancien@naturea.fr', password: 'old2026!', name: 'Ancien collaborateur', role: 'Commercial', franchise: 'Franchise A', actif: false },
];

export const APPS_META = [
  { code: 'RESEAU' as AppCode, name: 'Réseau', navLabel: 'Réseau', navClass: 'a-reseau', icon: '📊', className: 't-recrut', desc: "Vue d'ensemble du réseau : audits, formations, communications, agenda.", route: '/reseau', kpiPublic: false },
  { code: 'CODIR' as AppCode, name: 'Codir', navLabel: 'Codir', navClass: 'a-codir', icon: '📈', className: 't-codir', desc: "Pilotage exécutif. Plan d'actions, suivi des décisions.", route: '/apps/codir' },
  { code: 'RECRUT' as AppCode, name: 'Recrutement Franchise', navLabel: 'Recrutement', navClass: 'a1', icon: '🤝', className: 't-recrut', desc: 'Pipeline candidats franchisés.', route: '/apps/recrutement' },
  { code: 'OSSATURE' as AppCode, name: 'OssatureTrack', navLabel: 'Ossature', navClass: 'a2', icon: '🏗️', className: 't-ossature', desc: 'Suivi fabrication ossatures bois.', route: '/apps/ossature' },
  { code: 'AUDIT' as AppCode, name: 'Audit technique', navLabel: 'Audit technique', navClass: 'a3', icon: '📋', className: 't-audit', desc: 'Contrôle qualité chantier sur site.', route: '/apps/audit-technique', kpiPublic: true },
  { code: 'AUDIT_COM' as AppCode, name: 'Audit commerce', navLabel: 'Audit commerce', navClass: 'a3', icon: '🗂️', className: 't-audit', desc: 'Suivi commercial des franchises.', route: '/apps/audit-commerce', kpiPublic: true },
  { code: 'CHIFFRAGE' as AppCode, name: 'Chiffrage Naturéa', navLabel: 'Chiffrage', navClass: 'a5', icon: '💰', className: 't-chiffrage', desc: 'Estimateur multi-usines pour devis client.', route: '/apps/chiffrage' },
  { code: 'ADMIN' as AppCode, name: 'Administration', navLabel: 'Admin', navClass: 'a-admin', icon: '⚙️', className: 't-audit', desc: 'Gestion des utilisateurs et des permissions.', route: '/admin' },
];
