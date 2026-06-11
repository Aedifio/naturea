import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  CharpenteExtValues,
  ChiffrageProjet,
  RecapResult,
  UsineKey,
} from '../chiffrage.models';
import { EMPTY_CHARPENTE_EXT } from '../chiffrage.models';
import { ChiffrageDataService } from './chiffrage-data.service';
import { ChiffrageEstimatorService } from './chiffrage-estimator.service';
import { ChiffrageToastService } from './chiffrage-toast.service';

const DEFAULT_USINE: UsineKey = 'boisboreal';

@Injectable({ providedIn: 'root' })
export class ChiffrageUiService {
  private readonly data = inject(ChiffrageDataService);
  private readonly estimator = inject(ChiffrageEstimatorService);
  private readonly toast = inject(ChiffrageToastService);

  readonly currentUsine = signal<UsineKey>(DEFAULT_USINE);
  readonly values = signal<Record<string, number>>({});
  readonly manualFields = signal<Set<string>>(new Set());
  readonly charpenteExt = signal<CharpenteExtValues>({ ...EMPTY_CHARPENTE_EXT });
  readonly projetNom = signal('');
  readonly projetRef = signal('');

  readonly recap = computed<RecapResult>(() =>
    this.estimator.calcRecap(this.currentUsine(), this.values(), this.charpenteExt()),
  );

  setUsine(usineKey: UsineKey): void {
    this.currentUsine.set(usineKey);
    this.values.set({});
    this.manualFields.set(new Set());
    this.applySchemaDefaults(usineKey);
  }

  setFieldValue(fieldId: string, rawValue: number): void {
    const usine = this.currentUsine();
    const value = rawValue || 0;

    this.values.update((v) => ({ ...v, [fieldId]: value }));

    const autoUpdates = this.estimator.applyAutoFill(usine, fieldId, value, this.manualFields());
    if (autoUpdates.length) {
      this.values.update((v) => {
        const next = { ...v };
        autoUpdates.forEach((u) => {
          next[u.target] = u.value;
        });
        return next;
      });
    }

    this.applyComputedFields();

    if (
      this.estimator.isAutoFillTarget(usine, fieldId) ||
      this.estimator.isComputedField(usine, fieldId)
    ) {
      this.manualFields.update((s) => {
        const next = new Set(s);
        next.add(fieldId);
        return next;
      });
    }
  }

  setCharpenteExtField(fieldId: keyof CharpenteExtValues, rawValue: string | number): void {
    this.charpenteExt.update((v) => ({
      ...v,
      [fieldId]:
        fieldId === 'fermette_type' ? String(rawValue) : parseFloat(String(rawValue)) || 0,
    }));
  }

  applyComputedFields(): void {
    const usine = this.currentUsine();
    const updates = this.estimator.applyComputedFields(usine, this.values(), this.manualFields());
    if (!updates.length) return;

    this.values.update((v) => {
      const next = { ...v };
      updates.forEach((u) => {
        next[u.fieldId] = u.value;
      });
      return next;
    });
  }

  resetForm(): void {
    this.values.set({});
    this.manualFields.set(new Set());
    this.charpenteExt.set({ ...EMPTY_CHARPENTE_EXT });
    this.projetNom.set('');
    this.projetRef.set('');
    this.applySchemaDefaults(this.currentUsine());
    this.applyComputedFields();
    this.toast.show('🔄 Formulaire réinitialisé');
  }

  loadProjet(id: number): ChiffrageProjet | null {
    const projet = this.data.projets().find((p) => p.id === id);
    if (!projet) return null;

    this.currentUsine.set(projet.usine);
    this.values.set(structuredClone(projet.values ?? {}));
    this.charpenteExt.set(structuredClone(projet.charpente_ext ?? { ...EMPTY_CHARPENTE_EXT }));
    this.projetNom.set(projet.nom ?? '');
    this.projetRef.set(projet.ref ?? '');
    this.manualFields.set(new Set());
    this.applyComputedFields();
    this.toast.show(`✓ Projet « ${projet.nom} » rouvert`);
    return projet;
  }

  reopenProjet(id: number): ChiffrageProjet | null {
    return this.loadProjet(id);
  }

  saveProjet(): { ok: boolean; error?: string; projet?: ChiffrageProjet } {
    const nom = this.projetNom().trim();
    const ref = this.projetRef().trim();
    const recap = this.recap();

    if (!nom) {
      this.toast.show('⚠️ Renseigne d\'abord le nom du client / projet');
      return { ok: false, error: 'nom_required' };
    }
    if (recap.totalGeneral <= 0) {
      this.toast.show('⚠️ Saisis des métrés avant de sauvegarder');
      return { ok: false, error: 'no_values' };
    }

    const usine = this.currentUsine();
    const factoryId = this.data.resolveFactoryId(usine);
    if (!factoryId) {
      this.toast.show('⚠️ Usine introuvable — réessayez dans un instant');
      return { ok: false, error: 'factory_missing' };
    }

    const creatorId = this.data.getCurrentCreatorId();
    const creatorName = this.data.getActiveCreatorName();

    const projet: ChiffrageProjet = {
      id: Date.now(),
      date: new Date().toISOString(),
      nom,
      ref,
      factoryId,
      agencyId: this.data.getActiveAgencyId(),
      usine,
      usineLabel: this.data.getUsineRef(usine).nom,
      total: recap.totalGeneral,
      agence: this.data.getActiveAgence(),
      createdBy: creatorId,
      createdByName: creatorName,
      values: structuredClone(this.values()),
      charpente_ext: structuredClone(this.charpenteExt()),
      lines: recap.lines.map((l) => ({ label: l.label, detail: l.detail, amount: l.amount })),
    };

    this.data.saveProjet(projet);
    this.toast.show(`✓ Projet « ${nom} » sauvegardé`);
    return { ok: true, projet };
  }

  deleteProjet(id: number): boolean {
    const existed = this.data.projets().some((p) => p.id === id);
    if (!existed) return false;
    this.data.deleteProjet(id);
    this.toast.show('🗑 Projet supprimé');
    return true;
  }

  initEstimator(): void {
    this.applySchemaDefaults(this.currentUsine());
    this.applyComputedFields();
  }

  private applySchemaDefaults(usineKey: UsineKey): void {
    const schema = this.estimator.buildEffectiveSchema(usineKey);
    const defaults: Record<string, number> = {};
    schema.forEach((item) => {
      if (item.default !== undefined && item.id) {
        defaults[item.id] = item.default;
      }
    });
    if (Object.keys(defaults).length) {
      this.values.set(defaults);
    }
  }
}
