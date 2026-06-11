import { Injectable, computed, inject, signal } from '@angular/core';
import { factoryKeyToOssatureSite } from '../../../core/models/factory.model';
import { AgencyService } from '../../../core/services/agency.service';
import { FactoryService } from '../../../core/services/factory.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { DOCS_SIGNATURE, STATUTS } from '../constants/ossature.constants';
import { NewOrderInput, OssatureOrder } from '../ossature.models';
import {
  sendDevisRetourEmail,
  sendEmailCommandeConfirmee,
  sendEmailUsine,
  sendPlanValidationEmail,
  sendSignatureConfirmEmail,
} from '../utils/ossature-email.util';
import { OssatureToastService } from './ossature-toast.service';

import { orderYear } from '../utils/ossature-format.util';

export { formatDeliveryDate, formatSurfaceM2, orderYear, surfaceM2 } from '../utils/ossature-format.util';

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
  if (!order?.deliveryDate) return false;
  return new Date(order.deliveryDate) < new Date();
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

@Injectable({ providedIn: 'root' })
export class OssatureDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly factory = inject(FactoryService);
  private readonly agencies = inject(AgencyService);
  private readonly toast = inject(OssatureToastService);
  private readonly _orders = signal<OssatureOrder[]>([]);
  private readonly _version = signal(0);

  readonly orders = computed(() => {
    this._version();
    return this._orders();
  });

  agencyLabel(order: OssatureOrder): string {
    return order.agencyName ?? this.agencies.getById(order.agencyId)?.name ?? '—';
  }

  factorySiteLabel(order: OssatureOrder): string {
    if (order.factorySite) return order.factorySite;
    const linked = this.factory.getById(order.factoryId);
    return linked ? factoryKeyToOssatureSite(linked.key) : '—';
  }

  matchesAgencyFilter(order: OssatureOrder, agencyName: string): boolean {
    if (!agencyName) return true;
    const id = this.agencies.resolveAgencyId(agencyName);
    return id != null && order.agencyId === id;
  }

  matchesFactorySiteFilter(order: OssatureOrder, site: string): boolean {
    return !site || this.factorySiteLabel(order) === site;
  }

  async load(): Promise<void> {
    const { data, error } = await this.supabase
      .from('ossature_orders')
      .select('*, agency:agency_id(id, name, contact_email), factory:factory_id(id, key, nom, contact_email)')
      .order('created', { ascending: false });
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
      return Object.keys(updates).length > 0 ? { ...o, ...updates } : o;
    });
    return changed ? next : list;
  }

  activeOrders(year?: number): OssatureOrder[] {
    const y = year ?? new Date().getFullYear();
    return this.orders().filter((o) => !o.archived && orderYear(o.created) === y);
  }

  archivedOrders(): OssatureOrder[] {
    return this.orders().filter((o) => o.archived);
  }

  availableYears(): number[] {
    return [...new Set(this.orders().map((o) => orderYear(o.created)))].sort((a, b) => b - a);
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
    const agency = this.agencies.getById(input.agencyId);
    const factory = this.factory.getById(input.factoryId);
    const order: OssatureOrder = {
      id: this.generateId(),
      agencyId: input.agencyId,
      factoryId: input.factoryId,
      agencyName: agency?.name,
      factorySite: factory ? factoryKeyToOssatureSite(factory.key) : undefined,
      reference: input.reference,
      surface: input.surface,
      plancher: input.plancher ?? null,
      statut: 'Devis demandé',
      deliveryDate: input.deliveryDate,
      permis: input.permis ?? null,
      docs: input.docs,
      docs_date: todayIso(),
      created: todayIso(),
    };
    void this.save([order, ...this.orders()]);
    sendEmailUsine(order, (factoryId) => this.factory.getById(factoryId)?.contact_email?.trim() ?? '');
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
        sendDevisRetourEmail(updated, (agencyId) => this.agencies.getById(agencyId)?.contact_email?.trim() ?? '');
        this.toast.show(`📧 Email ouvert vers ${this.agencyLabel(updated)}`);
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
        sendSignatureConfirmEmail(signed, (factoryId) => this.factory.getById(factoryId)?.contact_email?.trim() ?? '');
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
          sendPlanValidationEmail(updated, (factoryId) => this.factory.getById(factoryId)?.contact_email?.trim() ?? '');
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
    'id', 'agencyId', 'factoryId', 'agencyName', 'factorySite', 'reference', 'surface', 'plancher', 'statut',
    'deliveryDate', 'permis', 'docs', 'docs_date', 'created',
  ]);

  private orderToRow(order: OssatureOrder): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(order)) {
      if (!OssatureDataService.ORDER_COLUMNS.has(k)) payload[k] = v;
    }
    return {
      id: order.id,
      agency_id: order.agencyId,
      factory_id: order.factoryId,
      reference: order.reference,
      surface: order.surface,
      plancher: order.plancher ?? null,
      statut: order.statut,
      delivery_date: order.deliveryDate,
      permis: order.permis ?? null,
      docs: order.docs ?? [],
      docs_date: order.docs_date ?? null,
      created: order.created,
      payload,
    };
  }

  private rowToOrder(row: Record<string, unknown>): OssatureOrder {
    const payload = (row['payload'] as Record<string, unknown>) ?? {};
    const agency = row['agency'] as { id: number; name: string } | { id: number; name: string }[] | null;
    const factory = row['factory'] as { id: number; key: string } | { id: number; key: string }[] | null;
    const agencyRow = Array.isArray(agency) ? agency[0] : agency;
    const factoryRow = Array.isArray(factory) ? factory[0] : factory;
    const base: Record<string, unknown> = {
      id: row['id'],
      agencyId: row['agency_id'] ?? agencyRow?.id,
      factoryId: row['factory_id'] ?? factoryRow?.id,
      agencyName: agencyRow?.name,
      factorySite: factoryRow ? factoryKeyToOssatureSite(factoryRow.key) : undefined,
      reference: row['reference'],
      surface: Number(row['surface']),
      plancher: row['plancher'] == null ? null : Number(row['plancher']),
      statut: row['statut'],
      deliveryDate: String(row['delivery_date'] ?? ''),
      permis: row['permis'] == null ? null : String(row['permis']),
      docs: row['docs'],
      docs_date: row['docs_date'],
      created: row['created'],
    };
    const merged = { ...payload, ...base } as Record<string, unknown>;
    delete merged['livraison'];
    delete merged['annee'];
    return merged as unknown as OssatureOrder;
  }
}
