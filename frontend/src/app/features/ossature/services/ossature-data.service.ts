import { Injectable, computed, inject, signal } from '@angular/core';
import { DOCS_SIGNATURE, STATUTS } from '../constants/ossature.constants';
import { NewOrderInput, OssatureOrder } from '../ossature.models';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import {
  sendDevisRetourEmail,
  sendEmailCommandeConfirmee,
  sendEmailUsine,
  sendPlanValidationEmail,
  sendSignatureConfirmEmail,
} from '../utils/ossature-email.util';
import { OssatureToastService } from './ossature-toast.service';

export function parseSurface(str?: string): number {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 0;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function maxLivraisonDate(order: OssatureOrder): string {
  if (!order.signature_date) return '';
  try {
    const parts = order.signature_date.split('/');
    const d =
      parts.length === 3
        ? new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
        : new Date(order.signature_date);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + 49);
    return d.toLocaleDateString('fr-FR');
  } catch {
    return '';
  }
}

export function devisDelaiDepasse(order: OssatureOrder): boolean {
  if (!order?.created) return false;
  return order.statut === 'Devis demandé' && daysSince(order.created) > 15;
}

export function signatureDelaiDepasse(order: OssatureOrder): boolean {
  if (!order?.devis_retour || order.signature) return false;
  return daysSince(order.devis_retour_date) > 7;
}

export function planFabDelaiDepasse(order: OssatureOrder): boolean {
  if (!order?.created || order.docs_recus_date) return false;
  return order.statut === 'Commande confirmée' && daysSince(order.created) > 15;
}

export function arLivraisonDepasse(order: OssatureOrder): boolean {
  if (!order?.livraison) return false;
  return new Date(order.livraison) < new Date();
}

export function isLivraisonDefDelayed(order: OssatureOrder): boolean {
  if (!order.livraison_definitive) return false;
  const maxD = maxLivraisonDate(order);
  if (!maxD) return false;
  try {
    const parts = maxD.split('/');
    const maxDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    return new Date(order.livraison_definitive) > maxDate;
  } catch {
    return false;
  }
}

export function statutLabel(statut: string): string {
  return statut === 'Devis envoyé' ? 'Devis reçu' : statut;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function nowFrDate(): string {
  return new Date().toLocaleDateString('fr-FR');
}

export const OSSATURE_SEED: OssatureOrder[] = [
  {
    id: 'CMD-001',
    franchise: 'TARN MAISON OSSATURE BOIS',
    reference: 'VILLA-MODERNA-2026',
    surface: '142 m²',
    plancher: '98 m²',
    site: 'IMAJ',
    statut: 'Devis demandé',
    livraison: '2026-09-15',
    permis: '2026-04-01',
    docs: ['bdc_appuis.pdf', 'bdc_coffre.pdf', 'plan_pc.pdf', 'plan_mext.pdf', 'fiche_mob.pdf', 'devis_mext.pdf'],
    docs_date: '2026-05-20',
    created: '2026-05-15',
    annee: 2026,
  },
  {
    id: 'CMD-002',
    franchise: 'GP-MEOB',
    reference: 'MAISON-CONTEMPORAINE-A',
    surface: '118 m²',
    plancher: '86 m²',
    site: 'SAVARE',
    statut: 'Devis envoyé',
    livraison: '2026-10-01',
    permis: '2026-03-15',
    docs: ['bdc_appuis.pdf', 'bdc_coffre.pdf', 'plan_pc.pdf', 'plan_mext.pdf', 'fiche_mob.pdf', 'devis_mext.pdf'],
    docs_date: '2026-04-10',
    created: '2026-04-05',
    annee: 2026,
    devis_retour: 'devis_retour_CMD-002.pdf',
    devis_retour_date: '2026-04-20',
    docs_recus_date: '2026-04-08',
    docs_recus_heure: '14:30',
  },
  {
    id: 'CMD-003',
    franchise: 'BOISILIA CONSTRUCTION',
    reference: 'RESIDENCE-BELLEVUE',
    surface: '156 m²',
    plancher: '112 m²',
    site: 'IMAJ',
    statut: 'Commande confirmée',
    livraison: '2026-08-20',
    permis: '2026-02-01',
    docs: ['bdc_appuis.pdf', 'bdc_coffre.pdf', 'plan_pc.pdf', 'plan_mext.pdf', 'fiche_mob.pdf', 'devis_mext.pdf'],
    docs_date: '2026-03-01',
    created: '2026-02-25',
    annee: 2026,
    devis_retour: 'devis_retour_CMD-003.pdf',
    devis_retour_date: '2026-03-10',
    docs_recus_date: '2026-03-02',
    docs_recus_heure: '09:15',
    signature: 'data:image/png;base64,iVBORw0KGgo=',
    signature_date: '15/03/2026',
    signature_heure: '11:20',
    signature_docs: DOCS_SIGNATURE.map((d) => `${d.id}.pdf`),
    ar_fichier: 'ar_CMD-003.pdf',
    ar_date: '2026-03-16',
    ar_heure: '10:00',
    plan_fab: 'plan_fab_CMD-003.pdf',
    plan_fab_date: '2026-03-20',
  },
  {
    id: 'CMD-004',
    franchise: 'ECOHOME 84',
    reference: 'VILLA-PROVENCALE',
    surface: '198 m²',
    plancher: '145 m²',
    site: 'SAVARE',
    statut: 'Expédition validée',
    livraison: '2026-06-01',
    permis: '2025-11-01',
    docs: ['bdc_appuis.pdf', 'bdc_coffre.pdf', 'plan_pc.pdf', 'plan_mext.pdf', 'fiche_mob.pdf', 'devis_mext.pdf'],
    docs_date: '2025-12-01',
    created: '2025-11-25',
    annee: 2025,
    devis_retour: 'devis_retour_CMD-004.pdf',
    devis_retour_date: '2025-12-10',
    docs_recus_date: '2025-12-02',
    docs_recus_heure: '16:45',
    signature: 'data:image/png;base64,iVBORw0KGgo=',
    signature_date: '20/12/2025',
    signature_heure: '14:00',
    signature_docs: DOCS_SIGNATURE.map((d) => `${d.id}.pdf`),
    ar_fichier: 'ar_CMD-004.pdf',
    ar_date: '2025-12-22',
    ar_heure: '09:30',
    plan_fab: 'plan_fab_CMD-004.pdf',
    plan_fab_date: '2026-01-05',
    plan_val_signature: 'data:image/png;base64,iVBORw0KGgo=',
    plan_val_date: '15/01/2026',
    plan_val_heure: '10:30',
    plan_val_docs: [{ name: 'plan_val_annexe.pdf', date: '2026-01-10' }],
    livraison_definitive: '2026-05-28',
  },
  {
    id: 'CMD-005',
    franchise: 'ACVR HOME',
    reference: 'MAISON-FAMILIALE-B',
    surface: '132 m²',
    site: 'BOISBOREAL',
    statut: 'Devis demandé',
    livraison: '2026-11-01',
    docs: ['bdc_appuis.pdf', 'bdc_coffre.pdf', 'plan_pc.pdf', 'plan_mext.pdf', 'fiche_mob.pdf', 'devis_mext.pdf'],
    docs_date: '2026-01-10',
    created: '2025-12-20',
    annee: 2025,
  },
  {
    id: 'CMD-006',
    franchise: 'NATI BRETAGNE NORD',
    reference: 'OSS-BZH-2025-88',
    surface: '175 m²',
    plancher: '120 m²',
    site: 'SAVARE',
    statut: 'Expédition validée',
    livraison: '2025-10-15',
    docs: ['bdc_appuis.pdf', 'bdc_coffre.pdf', 'plan_pc.pdf', 'plan_mext.pdf', 'fiche_mob.pdf', 'devis_mext.pdf'],
    created: '2025-06-01',
    annee: 2025,
    devis_retour: 'devis_retour_CMD-006.pdf',
    devis_retour_date: '2025-06-15',
    signature: 'data:image/png;base64,iVBORw0KGgo=',
    signature_date: '01/07/2025',
    signature_heure: '09:00',
    signature_docs: DOCS_SIGNATURE.map((d) => `${d.id}.pdf`),
    ar_fichier: 'ar_CMD-006.pdf',
    ar_date: '2025-07-05',
    plan_fab: 'plan_fab_CMD-006.pdf',
    plan_fab_date: '2025-07-20',
    plan_val_signature: 'data:image/png;base64,iVBORw0KGgo=',
    plan_val_date: '05/08/2025',
    plan_val_heure: '11:00',
    livraison_definitive: '2025-10-10',
    archived: true,
    archived_date: '2025-11-01',
  },
];

@Injectable({ providedIn: 'root' })
export class OssatureDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(OssatureToastService);
  private readonly _orders = signal<OssatureOrder[]>([]);
  private readonly _version = signal(0);

  readonly orders = computed(() => {
    this._version();
    return this._orders();
  });

  async load(): Promise<void> {
    const { data, error } = await this.supabase.from('ossature_orders').select('*').order('created', { ascending: false });
    if (error) {
      console.error('[Ossature] load failed', error);
      return;
    }
    const list = (data ?? []).map((r) => this.rowToOrder(r as Record<string, unknown>));
    const migrated = this.migrateStatuts(list);
    this._orders.set(migrated);
    this._version.update((v) => v + 1);
    if (migrated !== list) void this.save(migrated);
  }

  bump(): void {
    this._version.update((v) => v + 1);
  }

  async save(list: OssatureOrder[]): Promise<void> {
    const rows = list.map((o) => this.orderToRow(o));
    const { error } = await this.supabase.from('ossature_orders').upsert(rows);
    if (error) throw error;
    this._orders.set(list);
    this.bump();
  }

  getById(id: string): OssatureOrder | undefined {
    return this.orders().find((o) => o.id === id);
  }

  generateId(): string {
    const n = this.orders().length + 1;
    return `CMD-${String(n).padStart(3, '0')}`;
  }

  migrateStatuts(list: OssatureOrder[]): OssatureOrder[] {
    let changed = false;
    const next = list.map((o) => {
      const updates: Partial<OssatureOrder> = {};
      if (o.statut === 'En production') {
        updates.statut = 'Commande confirmée';
        changed = true;
      }
      if (o.statut === 'Prêt à expédier') {
        updates.statut = 'Expédition validée';
        changed = true;
      }
      if (o.livraison_definitive && o.plan_val_signature && o.statut !== 'Expédition validée') {
        updates.statut = 'Expédition validée';
        changed = true;
      }
      if (o.livraison_definitive && !o.plan_val_signature && o.statut === 'Expédition validée') {
        updates.statut = 'Commande confirmée';
        changed = true;
      }
      if (!o.annee) {
        updates.annee = o.created ? parseInt(o.created.slice(0, 4), 10) : new Date().getFullYear();
        changed = true;
      }
      return Object.keys(updates).length > 0 ? { ...o, ...updates } : o;
    });
    return changed ? next : list;
  }

  activeOrders(year?: number): OssatureOrder[] {
    const y = year ?? new Date().getFullYear();
    return this.orders().filter((o) => !o.archived && (o.annee || new Date().getFullYear()) === y);
  }

  archivedOrders(): OssatureOrder[] {
    return this.orders().filter((o) => o.archived);
  }

  availableYears(): number[] {
    return [...new Set(this.orders().map((o) => o.annee || new Date().getFullYear()))].sort((a, b) => b - a);
  }

  updateOrder(id: string, patch: Partial<OssatureOrder>): OssatureOrder | undefined {
    let updated: OssatureOrder | undefined;
    const list = this.orders().map((o) => {
      if (o.id !== id) return o;
      updated = { ...o, ...patch };
      return updated;
    });
    void this.save(list);
    return updated;
  }

  createOrder(input: NewOrderInput): OssatureOrder {
    const order: OssatureOrder = {
      id: this.generateId(),
      franchise: input.franchise,
      reference: input.reference,
      surface: input.surface,
      plancher: input.plancher,
      site: input.site,
      statut: 'Devis demandé',
      livraison: input.livraison,
      permis: input.permis,
      docs: input.docs,
      docs_date: todayIso(),
      created: todayIso(),
      annee: new Date().getFullYear(),
    };
    void this.save([order, ...this.orders()]);
    sendEmailUsine(order);
    return order;
  }

  updateStatut(id: string, newStatut: string): boolean {
    const o = this.getById(id);
    if (newStatut === 'Commande confirmée' && o?.devis_retour && !o.signature) {
      this.toast.show('⚠️ Le franchisé doit signer le devis avant de confirmer la commande');
      return false;
    }
    this.updateOrder(id, { statut: newStatut });
    this.toast.show(`✅ Statut mis à jour → ${newStatut}`);
    return true;
  }

  archiveOrder(id: string): void {
    this.updateOrder(id, { archived: true, archived_date: todayIso() });
    this.toast.show('📦 Commande archivée');
  }

  uploadDevisRetour(orderId: string, fname: string, promptEmail = true): void {
    this.updateOrder(orderId, {
      devis_retour: fname,
      devis_retour_date: todayIso(),
      statut: 'Devis envoyé',
    });
    this.toast.show('✅ Devis déposé — statut passé à "Devis envoyé"');
    if (promptEmail) {
      const updated = this.getById(orderId);
      if (updated && confirm("Envoyer un email au franchisé pour l'informer que le devis est disponible ?")) {
        sendDevisRetourEmail(updated);
        this.toast.show(`📧 Email ouvert vers ${updated.franchise}`);
      }
    }
  }

  deleteDevisRetour(orderId: string): void {
    if (
      !confirm(
        'Supprimer le devis envoyé ?\nLe statut repassera à "Devis demandé" et le franchisé ne pourra plus le signer.',
      )
    ) {
      return;
    }
    const o = this.getById(orderId);
    if (!o) return;
    const patch: Partial<OssatureOrder> = {
      devis_retour: undefined,
      devis_retour_date: undefined,
      devis_retour_heure: undefined,
      signature: undefined,
      signature_date: undefined,
      signature_heure: undefined,
      signature_docs: undefined,
    };
    if (o.statut === 'Devis envoyé') patch.statut = 'Devis demandé';
    this.updateOrder(orderId, patch);
    this.toast.show('🗑 Devis supprimé — statut repassé à "Devis demandé"');
  }

  confirmDocsRecus(orderId: string): void {
    this.updateOrder(orderId, { docs_recus_date: todayIso(), docs_recus_heure: nowTime() });
    this.toast.show(`✅ Documents marqués comme reçus le ${todayIso()} à ${nowTime()}`);
  }

  unconfirmDocsRecus(orderId: string): void {
    this.updateOrder(orderId, { docs_recus_date: undefined, docs_recus_heure: undefined });
    this.toast.show('↩️ Confirmation annulée');
  }

  saveSignature(orderId: string, sigData: string, sigDocs: string[], promptEmail = true): void {
    this.updateOrder(orderId, {
      signature: sigData,
      signature_date: nowFrDate(),
      signature_heure: nowTime(),
      signature_docs: sigDocs,
      statut: 'Commande confirmée',
    });
    this.toast.show('✅ Devis signé — commande confirmée !');
    if (promptEmail) {
      const signed = this.getById(orderId);
      if (
        signed &&
        confirm("Envoyer un email à l'usine et au coordinateur pour confirmer la signature du devis ?")
      ) {
        sendSignatureConfirmEmail(signed);
        this.toast.show('📧 Email ouvert vers usine');
      }
    }
  }

  replaceSigDoc(orderId: string, idx: number, fname: string): void {
    const o = this.getById(orderId);
    if (!o) return;
    const docs = [...(o.signature_docs ?? [])];
    docs[idx] = fname;
    this.updateOrder(orderId, { signature_docs: docs });
    this.toast.show('📎 Document remplacé');
  }

  removeSigDocFromOrder(orderId: string, idx: number): void {
    if (!confirm('Supprimer ce document ?')) return;
    const o = this.getById(orderId);
    if (!o) return;
    const docs = (o.signature_docs ?? []).filter((_, i) => i !== idx);
    const patch: Partial<OssatureOrder> = {
      signature_docs: docs,
      signature: undefined,
      signature_date: undefined,
      signature_heure: undefined,
    };
    if (o.statut === 'Commande confirmée') patch.statut = 'Devis envoyé';
    this.updateOrder(orderId, patch);
    this.toast.show('🗑 Document supprimé — veuillez signer à nouveau');
  }

  uploadAR(orderId: string, fname: string): void {
    this.updateOrder(orderId, { ar_fichier: fname, ar_date: todayIso(), ar_heure: nowTime() });
    this.toast.show(`✅ Accusé de réception déposé le ${todayIso()} à ${nowTime()}`);
  }

  deleteAR(orderId: string): void {
    if (!confirm("Supprimer l'accusé de réception ?")) return;
    this.updateOrder(orderId, { ar_fichier: undefined, ar_date: undefined, ar_heure: undefined });
    this.toast.show('🗑 Accusé de réception supprimé');
  }

  uploadPlanFab(orderId: string, fname: string): void {
    this.updateOrder(orderId, { plan_fab: fname, plan_fab_date: todayIso() });
    this.toast.show('✅ Plan de fabrication déposé');
  }

  deletePlanFab(orderId: string): void {
    if (!confirm('Supprimer le plan de fabrication ?')) return;
    this.updateOrder(orderId, { plan_fab: undefined, plan_fab_date: undefined });
    this.toast.show('🗑 Plan de fabrication supprimé');
  }

  addPlanValDoc(orderId: string, fname: string): void {
    const o = this.getById(orderId);
    if (!o) return;
    const docs = [...(o.plan_val_docs ?? []), { name: fname, date: todayIso() }];
    this.updateOrder(orderId, { plan_val_docs: docs });
    this.toast.show('📎 Document ajouté');
  }

  deletePlanValDoc(orderId: string, idx: number): void {
    const o = this.getById(orderId);
    if (!o) return;
    const docs = (o.plan_val_docs ?? []).filter((_, i) => i !== idx);
    this.updateOrder(orderId, { plan_val_docs: docs });
    this.toast.show('🗑 Document supprimé');
  }

  savePlanValidationSignature(orderId: string, sigData: string, promptEmail = true): void {
    const o = this.getById(orderId);
    if (!o) return;
    const newStatut = o.livraison_definitive ? 'Expédition validée' : o.statut;
    this.updateOrder(orderId, {
      plan_val_signature: sigData,
      plan_val_date: nowFrDate(),
      plan_val_heure: nowTime(),
      statut: newStatut,
      statut_secondaire: null,
    });
    const updated = this.getById(orderId);
    if (updated?.statut === 'Expédition validée') {
      this.toast.show('✅ Plans validés — statut passé à "Expédition validée"');
    } else {
      this.toast.show('✅ Plans validés et signés');
    }
    if (promptEmail && updated) {
      setTimeout(() => {
        if (confirm("Envoyer un email à l'usine pour confirmer la validation des plans ?")) {
          sendPlanValidationEmail(updated);
          this.toast.show('📧 Email ouvert vers usine');
        }
      }, 400);
    }
  }

  invalidatePlanValidation(orderId: string): void {
    if (!confirm('Dévalider la signature des plans ?\nLe franchisé devra signer à nouveau.')) return;
    const o = this.getById(orderId);
    if (!o) return;
    const patch: Partial<OssatureOrder> = {
      plan_val_signature: undefined,
      plan_val_date: undefined,
      plan_val_heure: undefined,
    };
    if (o.statut === 'Expédition validée') patch.statut = 'Commande confirmée';
    this.updateOrder(orderId, patch);
    this.toast.show('🗑 Signature des plans annulée');
  }

  saveLivraisonDefinitive(orderId: string, value: string): void {
    if (!value) {
      this.toast.show('⚠️ Veuillez saisir une date');
      return;
    }
    const o = this.getById(orderId);
    if (!o) return;
    const plansSignes = !!o.plan_val_signature;
    const newStatut = plansSignes ? 'Expédition validée' : o.statut;
    const statutSecondaire = plansSignes ? null : 'En attente de validation des plans';
    this.updateOrder(orderId, {
      livraison_definitive: value,
      statut: newStatut,
      statut_secondaire: statutSecondaire,
    });
    if (plansSignes) {
      this.toast.show('✅ Date enregistrée — statut passé à "Expédition validée"');
    } else {
      this.toast.show('📅 Date enregistrée — en attente de validation des plans par le franchisé');
    }
  }

  deleteLivraisonDefinitive(orderId: string): void {
    if (!confirm('Effacer la date de livraison définitive ?\nLe statut repassera à "Commande confirmée".')) return;
    this.updateOrder(orderId, {
      livraison_definitive: undefined,
      statut: 'Commande confirmée',
    });
    this.toast.show('🗑 Date supprimée — statut repassé à "Commande confirmée"');
  }

  downloadDoc(fname: string): void {
    alert(
      `📄 ${fname}\n\nLe téléchargement sera disponible une fois connecté à la base de données (option B).\nPour l'instant les fichiers sont référencés par nom.`,
    );
  }

  statutIndex(statut: string): number {
    return STATUTS.indexOf(statut as (typeof STATUTS)[number]);
  }

  ordersEnRetardDevis(): OssatureOrder[] {
    return this.orders().filter((o) => devisDelaiDepasse(o));
  }

  ordersEnRetardSig(): OssatureOrder[] {
    return this.orders().filter((o) => signatureDelaiDepasse(o));
  }

  ordersEnRetardPlans(): OssatureOrder[] {
    return this.orders().filter((o) => planFabDelaiDepasse(o));
  }

  private static readonly ORDER_COLUMNS = new Set([
    'id', 'franchise', 'reference', 'surface', 'plancher', 'site', 'statut',
    'livraison', 'permis', 'docs', 'docs_date', 'created', 'annee',
  ]);

  private orderToRow(order: OssatureOrder): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(order)) {
      if (!OssatureDataService.ORDER_COLUMNS.has(k)) payload[k] = v;
    }
    return {
      id: order.id,
      franchise: order.franchise,
      reference: order.reference,
      surface: order.surface,
      plancher: order.plancher ?? null,
      site: order.site,
      statut: order.statut,
      livraison: order.livraison,
      permis: order.permis ?? null,
      docs: order.docs ?? [],
      docs_date: order.docs_date ?? null,
      created: order.created,
      annee: order.annee ?? new Date().getFullYear(),
      payload,
    };
  }

  private rowToOrder(row: Record<string, unknown>): OssatureOrder {
    const payload = (row['payload'] as Record<string, unknown>) ?? {};
    const base: Record<string, unknown> = {
      id: row['id'],
      franchise: row['franchise'],
      reference: row['reference'],
      surface: row['surface'],
      plancher: row['plancher'],
      site: row['site'],
      statut: row['statut'],
      livraison: row['livraison'],
      permis: row['permis'],
      docs: row['docs'],
      docs_date: row['docs_date'],
      created: row['created'],
      annee: row['annee'],
    };
    return { ...payload, ...base } as unknown as OssatureOrder;
  }
}
