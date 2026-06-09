import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DOCS_SIGNATURE, STATUTS } from '../constants/ossature.constants';
import { OssatureOrder } from '../ossature.models';
import {
  daysSince,
  devisDelaiDepasse,
  isLivraisonDefDelayed,
  maxLivraisonDate,
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

  readonly statuts = STATUTS;
  readonly docsSignature = DOCS_SIGNATURE;

  readonly open = computed(() => this.modals.detailOrderId() !== null);
  readonly order = computed(() => {
    const id = this.modals.detailOrderId();
    return id ? this.data.getById(id) : undefined;
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
    if (!id || !input.files?.[0]) return;
    this.data.uploadDevisRetour(id, input.files[0].name);
    input.value = '';
  }

  onARUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const id = this.order()?.id;
    if (!id || !input.files?.[0]) return;
    this.data.uploadAR(id, input.files[0].name);
    input.value = '';
  }

  onPlanFabUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const id = this.order()?.id;
    if (!id || !input.files?.[0]) return;
    this.data.uploadPlanFab(id, input.files[0].name);
    input.value = '';
  }

  onPlanFabDrop(e: DragEvent): void {
    e.preventDefault();
    const id = this.order()?.id;
    const f = e.dataTransfer?.files[0];
    if (id && f) this.data.uploadPlanFab(id, f.name);
  }

  onPlanValDoc(e: Event): void {
    const input = e.target as HTMLInputElement;
    const id = this.order()?.id;
    if (!id || !input.files?.[0]) return;
    this.data.addPlanValDoc(id, input.files[0].name);
    input.value = '';
  }

  onSigDocReplace(idx: number, e: Event): void {
    const input = e.target as HTMLInputElement;
    const id = this.order()?.id;
    if (!id || !input.files?.[0]) return;
    this.data.replaceSigDoc(id, idx, input.files[0].name);
    input.value = '';
  }

  onSigDocDrop(idx: number, e: DragEvent): void {
    e.preventDefault();
    const id = this.order()?.id;
    const f = e.dataTransfer?.files[0];
    if (id && f) this.data.replaceSigDoc(id, idx, f.name);
  }

  alertDelai(o: OssatureOrder): void {
    sendAlertDelai(o, (site) => this.factory.getEmailForOssatureSite(site));
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

  download(fname: string): void {
    this.data.downloadDoc(fname);
  }
}
