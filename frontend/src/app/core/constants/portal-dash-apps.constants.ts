import { AppCode } from '../models/user.model';

export const PORTAL_DASH_APPS = [
  { key: 'codir', name: 'CODIR', icon: '📈', cls: 'c-codir', app: 'CODIR' as AppCode, route: '/apps/codir' },
  {
    key: 'recrut',
    name: 'Recrutement franchisés',
    icon: '🤝',
    cls: 'c-recrut',
    app: 'RECRUT' as AppCode,
    route: '/apps/recrutement',
  },
  { key: 'ossature', name: 'Ossature / Track', icon: '🏗️', cls: 'c-ossature', app: 'OSSATURE' as AppCode, route: '/apps/ossature' },
  { key: 'audit', name: 'Audit technique', icon: '📋', cls: 'c-audit', app: 'AUDIT' as AppCode, route: '/apps/audit-technique' },
  { key: 'audit_com', name: 'Audit commerce', icon: '🗂️', cls: 'c-audit', app: 'AUDIT_COM' as AppCode, route: '/apps/audit-commerce' },
  { key: 'chiffrage', name: 'Chiffrage', icon: '💰', cls: 'c-chiffrage', app: 'CHIFFRAGE' as AppCode, route: '/apps/chiffrage' },
  { key: 'admin', name: 'Administration', icon: '⚙️', cls: 'c-audit', app: 'ADMIN' as AppCode, route: '/admin' },
] as const;
