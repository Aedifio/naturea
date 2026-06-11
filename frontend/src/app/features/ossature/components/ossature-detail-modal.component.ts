import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DOCS_REQUIS, DOCS_SIGNATURE, STATUTS } from '../constants/ossature.constants';
import { OssatureOrder, OssatureOrderFileKind } from '../ossature.models';
import {
  daysSince,
  devisDelaiDepasse,
  isLivraisonDefDelayed,
  maxLivraisonDate,
  formatDeliveryDate,
  formatSurfaceM2,
  OssatureDataService,
  planFabDelaiDepasse,
} from '../services/ossature-data.service';
import { OssatureModalService } from '../services/ossature-modal.service';
import { OssatureModeService } from '../services/ossature-mode.service';
import { FactoryService } from '../../../core/services/factory.service';
import { sendAlertDelai } from '../utils/ossature-email.util';

@Component({
  selector: 'app-ossature-detail-modal',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './ossature-detail-modal.component.html',
})
export class OssatureDetailModalComponent {
  readonly data = inject(OssatureDataService);
  readonly factory = inject(FactoryService);
  readonly modals = inject(OssatureModalService);
  readonly mode = inject(OssatureModeService);

  readonly formatSurfaceM2 = formatSurfaceM2;
  readonly formatDeliveryDate = formatDeliveryDate;
  readonly statuts = STATUTS;
  readonly docsSignature = DOCS_SIGNATURE;

  readonly open = computed(() => this.modals.detailOrderId() !== null);
  readonly order = computed(() => {
    const id = this.modals.detailOrderId();
    return id ? this.data.getById(id) : undefined;
  });

  readonly docsRequis = computed(() => {
    const o = this.order();
    if (!o) return [];
    const bySlot = new Map(
      this.data
        .getOrderFileRefs(o.id)
        .filter((r) => r.kind === 'doc_requis')
        .map((r) => [r.slot, r]),
    );
    return DOCS_REQUIS.filter((d) => bySlot.has(d.id)).map((d) => ({
      slot: d.id,
      label: d.label,
      filename: bySlot.get(d.id)!.filename,
    }));
  });

  readonly signatureFiles = computed(() => {
    const o = this.order();
    if (!o) return [];
    const bySlot = new Map(
      this.data
        .getOrderFileRefs(o.id)
        .filter((r) => r.kind === 'signature')
        .map((r) => [r.slot, r]),
    );
    return DOCS_SIGNATURE.map((d, sigIdx) => {
      const ref = bySlot.get(d.id);
      if (!ref) return null;
      return { slot: d.id, label: d.label, filename: ref.filename, sigIdx };
    }).filter((x): x is NonNullable<typeof x> => !!x);
  });

  readonly showDocs = signal(true);
  readonly showDocsRecus = signal(true);
  readonly showDevisRetour = signal(true);
  readonly editLivDef = signal(false);
  livDefValue = '';

  readonly isCoord = computed(() => this.mode.isCoord());
  readonly isFranchise = computed(() => this.mode.isFranchise());
  readonly isUsine = computed(() => this.mode.isUsine());

  readonly devisValide = computed(() => {
    const o = this.order();
    return o ? ['Commande confirmée', 'Expédition validée'].includes(o.statut) : false;
  });

  readonly showProd = computed(() => {
    const o = this.order();
    return o ? ['Commande confirmée', 'Expédition validée'].includes(o.statut) : false;
  });

  readonly showSigSection = computed(() => {
    const o = this.order();
    return !!(o?.devis_retour && !o.ar_fichier);
  });

  readonly showDocsRecusSection = computed(() => {
    const o = this.order();
    return !!(o?.docs?.length);
  });

  readonly canArchive = computed(() => {
    const o = this.order();
    return (
      (this.isCoord() || this.isFranchise()) && o?.statut === 'Expédition validée' && !o.archived
    );
  });

  readonly showSecStatut = computed(() => {
    const o = this.order();
    return !!(o && !o.plan_val_signature && o.statut === 'Commande confirmée');
  });

  statutIndex(statut: string): number {
    return this.data.statutIndex(statut);
  }

  toggleDocs(): void {
    this.showDocs.update((v) => !v);
  }

  toggleDocsRecus(): void {
    this.showDocsRecus.update((v) => !v);
  }

  toggleDevisRetour(): void {
    this.showDevisRetour.update((v) => !v);
  }

  close(e?: MouseEvent): void {
    if (e && (e.target as HTMLElement).classList.contains('modal-overlay') === false) {
      this.modals.closeDetail();
      return;
    }
    if (!e || (e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.modals.closeDetail();
    }
  }

  closeBtn(): void {
    this.modals.closeDetail();
  }

  siteAdresse(site: string): string {
    return this.factory.getOssatureSiteAddress(site);
  }

  maxLivraison(o: OssatureOrder): string {
    return maxLivraisonDate(o);
  }

  daysSince(d?: string): number {
    return daysSince(d);
  }

  devisDelai(o: OssatureOrder): boolean {
    return devisDelaiDepasse(o);
  }

  planFabDelai(o: OssatureOrder): boolean {
    return planFabDelaiDepasse(o);
  }

  livDefLate(o: OssatureOrder): boolean {
    return isLivraisonDefDelayed(o);
  }

  updateStatut(statut: string): void {
    const id = this.order()?.id;
    if (!id) return;
    if (this.data.updateStatut(id, statut)) {
      this.modals.closeDetail();
    }
  }

  onDevisUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const id = this.order()?.id;
    const file = input.files?.[0];
    if (!id || !file) return;
    void this.data.uploadDevisRetour(id, file);
    input.value = '';
  }

  onARUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const id = this.order()?.id;
    const file = input.files?.[0];
    if (!id || !file) return;
    void this.data.uploadAR(id, file);
    input.value = '';
  }

  onPlanFabUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const id = this.order()?.id;
    const file = input.files?.[0];
    if (!id || !file) return;
    void this.data.uploadPlanFab(id, file);
    input.value = '';
  }

  onPlanFabDrop(e: DragEvent): void {
    e.preventDefault();
    const id = this.order()?.id;
    const f = e.dataTransfer?.files[0];
    if (id && f) void this.data.uploadPlanFab(id, f);
  }

  onPlanValDoc(e: Event): void {
    const input = e.target as HTMLInputElement;
    const id = this.order()?.id;
    const file = input.files?.[0];
    if (!id || !file) return;
    void this.data.addPlanValDoc(id, file);
    input.value = '';
  }

  onSigDocReplace(idx: number, e: Event): void {
    const input = e.target as HTMLInputElement;
    const id = this.order()?.id;
    const file = input.files?.[0];
    if (!id || !file) return;
    void this.data.replaceSigDoc(id, idx, file);
    input.value = '';
  }

  onSigDocDrop(idx: number, e: DragEvent): void {
    e.preventDefault();
    const id = this.order()?.id;
    const f = e.dataTransfer?.files[0];
    if (id && f) void this.data.replaceSigDoc(id, idx, f);
  }

  alertDelai(o: OssatureOrder): void {
    sendAlertDelai(o, (factoryId) => this.factory.getById(factoryId)?.contact_email?.trim() ?? '');
  }

  saveLivDef(): void {
    const id = this.order()?.id;
    if (!id || !this.livDefValue) return;
    this.data.saveLivraisonDefinitive(id, this.livDefValue);
    this.editLivDef.set(false);
  }

  startEditLivDef(): void {
    this.livDefValue = this.order()?.livraison_definitive ?? '';
    this.editLivDef.set(true);
  }

  archive(): void {
    const id = this.order()?.id;
    if (!id) return;
    if (!confirm('Archiver cette commande ?\nElle sera masquée des vues principales mais restera accessible dans les archives.')) {
      return;
    }
    this.data.archiveOrder(id);
    this.modals.closeDetail();
  }

  openSignDevis(): void {
    const id = this.order()?.id;
    if (id) this.modals.openSignature(id, 'devis');
  }

  openSignPlan(): void {
    const id = this.order()?.id;
    if (id) this.modals.openSignature(id, 'plan_val');
  }

  download(kind: OssatureOrderFileKind, slot: string): void {
    const id = this.order()?.id;
    if (!id) return;
    void this.data.downloadOrderFile(id, kind, slot);
  }
}
