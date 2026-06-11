/** localStorage keys — keep in sync with CONTRAT_INTERFACES.md */
export enum StorageKey {
  ActiveUser = 'naturea_active_user',
  Actus = 'naturea_actus',
  Events = 'naturea_events',
  Newsletter = 'naturea_newsletter',
  CodirData = 'codir:data:v4',
  CodirCurrentUser = 'codir:currentUser',
  Recrutement = 'fhv3',
  OssatureOrders = 'ossature_orders',
  AuditTechnique = 'naturea_pc_v1',
  AuditCommerce = 'fnet:data:v1',
  ChiffrageTarifsHistory = 'chiffrage:tarifs_history:v1',
  ChiffrageOverrides = 'chiffrage_overrides_v1',
  ChiffrageFormOverrides = 'chiffrage_form_overrides_v1',
  ChiffrageCustomPostes = 'chiffrage_custom_postes_v1',
  /** Session persistence for Angular auth (not in legacy contract) */
  AuthSession = 'naturea_auth_session',
}
