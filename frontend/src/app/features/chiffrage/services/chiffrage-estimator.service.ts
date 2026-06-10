import { inject, Injectable } from '@angular/core';
import { CHARPENTE_EXT } from '../constants/chiffrage-charpente.constants';
import { FIELD_TO_POSTE, FORM_SCHEMAS } from '../constants/chiffrage-form.constants';
import { AUTO_FILL_RULES, COMPUTED_FIELDS } from '../constants/chiffrage-rules.constants';
import type {
  AutoFillUpdate,
  CharpenteExtValues,
  CharpenteRecapLine,
  ComputedFieldUpdate,
  FormFieldSchema,
  RecapLine,
  RecapResult,
  UsineKey,
} from '../chiffrage.models';
import { fmtNum } from '../utils/chiffrage.utils';
import { ChiffrageDataService } from './chiffrage-data.service';

const CHARPENTE_ENSEMBLE_USINES: UsineKey[] = ['sicob'];

@Injectable({ providedIn: 'root' })
export class ChiffrageEstimatorService {
  private readonly data = inject(ChiffrageDataService);

  isCharpenteEnsembleUsine(usineKey: UsineKey): boolean {
    return CHARPENTE_ENSEMBLE_USINES.includes(usineKey);
  }

  isCharpenteHiddenForUsine(usineKey: UsineKey): boolean {
    const schema = FORM_SCHEMAS[usineKey];
    const map = FIELD_TO_POSTE[usineKey];
    if (!schema || !map) return false;

    let inCharp = false;
    for (const item of schema) {
      if (item.section) {
        inCharp = item.section.toLowerCase().includes('charpente');
      } else if (inCharp && item.id && !('ensemble' in item && item.ensemble)) {
        const mp = map[item.id as keyof typeof map];
        if (mp) {
          const p = this.data.getPoste(usineKey, mp.poste);
          if (p && p.visible === false) return true;
        }
      }
    }
    return false;
  }

  calcCharpenteExtEstim(charpenteExt: CharpenteExtValues): number {
    let total = 0;
    const ft = CHARPENTE_EXT.fermettes.find((f) => f.id === charpenteExt.fermette_type);
    if (ft && charpenteExt.surface > 0) total += ft.prix * charpenteExt.surface;
    CHARPENTE_EXT.accessoires.forEach((a) => {
      const qty = charpenteExt[a.id as keyof CharpenteExtValues];
      if (typeof qty === 'number' && qty > 0) total += a.prix * qty;
    });
    return total;
  }

  calcCharpenteExt(charpenteExt: CharpenteExtValues): number {
    if (charpenteExt.devis_ext > 0) return charpenteExt.devis_ext;
    return this.calcCharpenteExtEstim(charpenteExt);
  }

  buildEffectiveSchema(usineKey: UsineKey): FormFieldSchema[] {
    return this.data.buildEffectiveSchema(usineKey);
  }

  applyAutoFill(
    usineKey: UsineKey,
    fieldId: string,
    value: number,
    manualFields: Set<string>,
  ): AutoFillUpdate[] {
    const rules = AUTO_FILL_RULES[usineKey]?.[fieldId];
    if (!rules) return [];

    return rules
      .filter((rule) => !manualFields.has(rule.target))
      .map((rule) => ({
        target: rule.target,
        value: Math.round(value * rule.factor * 100) / 100,
      }));
  }

  isAutoFillTarget(usineKey: UsineKey, fieldId: string): boolean {
    const rules = AUTO_FILL_RULES[usineKey] ?? {};
    return Object.values(rules).some((arr) => arr?.some((r) => r.target === fieldId));
  }

  isAutoFillSource(usineKey: UsineKey, fieldId: string): boolean {
    const rules = AUTO_FILL_RULES[usineKey] ?? {};
    return !!rules[fieldId];
  }

  isComputedField(usineKey: UsineKey, fieldId: string): boolean {
    const cf = COMPUTED_FIELDS[usineKey] ?? {};
    return fieldId in cf;
  }

  applyComputedFields(
    usineKey: UsineKey,
    values: Record<string, number>,
    manualFields: Set<string>,
  ): ComputedFieldUpdate[] {
    const cf = COMPUTED_FIELDS[usineKey] ?? {};
    const updates: ComputedFieldUpdate[] = [];

    Object.entries(cf).forEach(([fieldId, fn]) => {
      if (manualFields.has(fieldId)) return;
      const result = fn(values);
      updates.push({ fieldId, value: result.value, hint: result.hint });
    });
    return updates;
  }

  getComputedHint(usineKey: UsineKey, fieldId: string, values: Record<string, number>): string | null {
    const cf = COMPUTED_FIELDS[usineKey] ?? {};
    const fn = cf[fieldId];
    if (!fn) return null;
    return fn(values).hint ?? null;
  }

  calcRecap(
    usineKey: UsineKey,
    values: Record<string, number>,
    charpenteExt: CharpenteExtValues,
  ): RecapResult {
    const u = this.data.getUsineRef(usineKey);
    const map = this.data.getEffectiveFieldMap(usineKey);
    const lines: RecapLine[] = [];
    let subtotal = 0;
    let hasAnyValue = false;

    Object.entries(map).forEach(([fieldId, mp]) => {
      const v = values[fieldId] || 0;
      if (v <= 0) return;
      hasAnyValue = true;
      const poste = this.data.getPoste(usineKey, mp.poste);
      if (!poste) return;

      const prix = this.data.getPrixCalcule(usineKey, mp.poste);
      const prixLabel = this.data.hasPrixOverride(usineKey, mp.poste)
        ? `💶${fmtNum(prix, 2)}`
        : fmtNum(prix, 2);
      let amount = 0;
      let detail = '';

      if (mp.type === 'surface' || mp.type === 'unite' || mp.type === 'volume') {
        amount = v * prix;
        const unitLabel = mp.type === 'surface' ? 'm²' : mp.type === 'volume' ? 'm³' : 'u';
        const decimals = mp.type === 'unite' ? 0 : mp.type === 'volume' ? 2 : 1;
        detail = `${fmtNum(v, decimals)} ${unitLabel} × ${prixLabel} €`;
      } else if (mp.type === 'forfait_qty') {
        amount = v * prix;
        detail = `${v} × ${prixLabel} €`;
      } else if (mp.type === 'direct') {
        amount = v;
        detail = 'saisi';
      }

      subtotal += amount;
      lines.push({ label: poste.label_user, detail, amount, fiab: poste.fiabilite });
    });

    if (!hasAnyValue) {
      return {
        subtotal: 0,
        totalGeneral: 0,
        lines: [],
        charpenteLines: [],
        charpenteTotal: 0,
        hasAnyValue: false,
        showCharpenteWarning: false,
        fiabiliteBanner: null,
        fiabiliteMessage: '',
      };
    }

    let totalGeneral = subtotal;
    const charpenteLines: CharpenteRecapLine[] = [];
    let charpenteTotal = 0;
    let showCharpenteWarning = false;

    if (this.isCharpenteHiddenForUsine(usineKey) || this.isCharpenteEnsembleUsine(usineKey)) {
      charpenteTotal = this.calcCharpenteExt(charpenteExt);

      if (charpenteTotal > 0) {
        totalGeneral += charpenteTotal;

        if (charpenteExt.devis_ext > 0) {
          charpenteLines.push({
            kind: 'devis',
            label: 'Devis charpentier reçu',
            detail: 'montant HT saisi',
            amount: charpenteExt.devis_ext,
          });
        } else {
          const ft = CHARPENTE_EXT.fermettes.find((f) => f.id === charpenteExt.fermette_type);
          if (ft && charpenteExt.surface > 0) {
            charpenteLines.push({
              kind: 'fermette',
              label: `Fermette ${ft.label}`,
              detail: `${fmtNum(charpenteExt.surface, 1)} m² × ${fmtNum(ft.prix, 2)} €`,
              amount: ft.prix * charpenteExt.surface,
            });
          }
          CHARPENTE_EXT.accessoires.forEach((a) => {
            const qty = charpenteExt[a.id as keyof CharpenteExtValues];
            if (typeof qty === 'number' && qty > 0) {
              charpenteLines.push({
                kind: 'accessoire',
                label: a.label,
                detail: `${fmtNum(qty, a.unite === 'ml' ? 1 : 0)} ${a.unite} × ${fmtNum(a.prix, 2)} €`,
                amount: a.prix * qty,
              });
            }
          });
        }
      } else if (charpenteExt.devis_ext <= 0) {
        showCharpenteWarning = true;
      }
    }

    let fiabiliteBanner: RecapResult['fiabiliteBanner'] = null;
    let fiabiliteMessage = '';
    if (u.devis_count < 5) {
      fiabiliteBanner = 'warn';
      fiabiliteMessage = `Fiabilité faible. Estimation s'appuie sur seulement ${u.devis_count} devis ${u.nom}.`;
    } else if (u.devis_count < 10) {
      fiabiliteBanner = 'medium';
      fiabiliteMessage = `Fiabilité moyenne. Basée sur ${u.devis_count} devis ${u.nom}. Marge ±10%.`;
    } else {
      fiabiliteBanner = 'high';
      fiabiliteMessage = `Fiabilité élevée. Basée sur ${u.devis_count} devis ${u.nom}. Précision ±5%.`;
    }

    return {
      subtotal,
      totalGeneral,
      lines,
      charpenteLines,
      charpenteTotal,
      hasAnyValue: true,
      showCharpenteWarning,
      fiabiliteBanner,
      fiabiliteMessage,
    };
  }
}
