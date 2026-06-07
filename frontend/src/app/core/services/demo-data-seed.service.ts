import { Injectable } from '@angular/core';
import codirSeed from '../data/codir-seed.json';
import { AUDIT_TECHNIQUE_SEED } from '../../features/audit-technique/constants/audit-seed.constants';
import { AUDIT_COMMERCE_SEED } from '../../features/audit-commerce/constants/audit-commerce-seed.constants';
import { OSSATURE_SEED } from '../../features/ossature/services/ossature-data.service';
import { RECRUTEMENT_SEED } from '../../features/recrutement/services/recrutement-data.service';
import { StorageKey } from '../models/storage-keys';
import { DEFAULT_ACTUS, DEFAULT_EVENTS } from '../services/portal-content.service';
import { StorageService } from '../storage/storage.service';

const SEED_FLAG = 'naturea_demo_seeded_v1';

@Injectable({ providedIn: 'root' })
export class DemoDataSeedService {
  constructor(private readonly storage: StorageService) {}

  seedIfNeeded(): void {
    this.ensurePortalContent();
    this.seedCodir();
    this.seedRecrutement();
    this.seedOssature();
    this.seedAuditTechnique();
    this.seedAuditCommerce();
    this.seedChiffrage();

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SEED_FLAG, '1');
    }
  }

  private ensurePortalContent(): void {
    if (!this.hasItems(StorageKey.Actus)) {
      this.storage.set(StorageKey.Actus, DEFAULT_ACTUS);
    }
    if (!this.hasItems(StorageKey.Events)) {
      this.storage.set(StorageKey.Events, DEFAULT_EVENTS);
    }
  }

  private seedCodir(): void {
    const data = this.storage.get<{ actions?: unknown[] }>(StorageKey.CodirData);
    if (data?.actions?.length) return;
    this.storage.set(StorageKey.CodirData, codirSeed);
  }

  private seedRecrutement(): void {
    if (this.hasItems(StorageKey.Recrutement)) return;
    this.storage.set(StorageKey.Recrutement, RECRUTEMENT_SEED);
  }

  private seedOssature(): void {
    if (this.hasItems(StorageKey.OssatureOrders)) return;
    this.storage.set(StorageKey.OssatureOrders, OSSATURE_SEED);
  }

  private seedAuditTechnique(): void {
    const existing = this.storage.get<{ agences?: Array<{ audits?: unknown[] }> }>(StorageKey.AuditTechnique);
    if (existing?.agences?.some((a) => (a.audits?.length ?? 0) > 0)) return;
    this.storage.set(StorageKey.AuditTechnique, AUDIT_TECHNIQUE_SEED);
  }

  private seedAuditCommerce(): void {
    const existing = this.storage.get<{ agencies?: Array<{ audits?: unknown[] }> }>(StorageKey.AuditCommerce);
    if (existing?.agencies?.some((a) => (a.audits?.length ?? 0) > 0)) return;
    this.storage.set(StorageKey.AuditCommerce, AUDIT_COMMERCE_SEED);
  }

  private seedChiffrage(): void {
    if (!this.hasItems(StorageKey.ChiffrageProjets)) {
      this.storage.set(StorageKey.ChiffrageProjets, [
        {
          id: 1,
          nom: 'Maison individuelle Durand',
          ref: 'CH-2026-042',
          usine: 'boisboreal',
          usineLabel: 'Bois Boréal',
          agence: 'Franchise A',
          total: 285000,
          date: new Date().toISOString(),
          user_name: 'Julie Leroy',
        },
        {
          id: 2,
          nom: 'Extension Les Cèdres',
          ref: 'CH-2026-038',
          usine: 'cobs',
          usineLabel: 'COBS',
          agence: 'Franchise A',
          total: 156000,
          date: '2026-05-20T10:00:00.000Z',
          user_name: 'Pierre Martin',
        },
        {
          id: 3,
          nom: 'Résidence Bellevue',
          ref: 'CH-2026-031',
          usine: 'sicob',
          usineLabel: 'SICOB',
          agence: 'Franchise A',
          total: 412000,
          date: '2026-04-12T14:30:00.000Z',
          user_name: 'Julie Leroy',
        },
      ]);
    }

    if (!this.hasItems(StorageKey.ChiffrageTarifsHistory)) {
      this.storage.set(StorageKey.ChiffrageTarifsHistory, [
        {
          id: 'h1',
          date_import: new Date().toISOString(),
          filename: 'tarifs_boisboreal_mai2026.pdf',
          usine: 'boisboreal',
          devis_num: 'D-4521',
          client: 'Durand',
          total_ht: 285000,
          postes: [
            { label_pdf: 'Ossature bois', applique: true, delta_pct: 2.4 },
            { label_pdf: 'Menuiseries', applique: true, delta_pct: -1.2 },
            { label_pdf: 'Isolation', applique: true, delta_pct: 3.8 },
          ],
        },
      ]);
    }
  }

  private hasItems(key: StorageKey): boolean {
    const v = this.storage.get<unknown>(key);
    return Array.isArray(v) && v.length > 0;
  }
}
