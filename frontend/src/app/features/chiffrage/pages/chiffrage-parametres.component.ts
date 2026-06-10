import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PrixType, UsineKey } from '../chiffrage.models';
import { REFS } from '../constants/chiffrage-refs.constants';
import { fmtDateFR, fmtNum } from '../utils/chiffrage.utils';
import { ChiffrageDataService } from '../services/chiffrage-data.service';
import { ChiffrageToastService } from '../services/chiffrage-toast.service';

@Component({
  selector: 'app-chiffrage-parametres',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chiffrage-parametres.component.html',
})
export class ChiffrageParametresComponent {
  readonly data = inject(ChiffrageDataService);
  readonly toast = inject(ChiffrageToastService);

  readonly expandedCards = signal<Record<string, boolean>>({});

  readonly usines = computed(() =>
    this.data.usineKeys().map((key) => ({ key, ref: this.data.getUsineRef(key) })),
  );

  fmtNum = fmtNum;
  fmtDateFR = fmtDateFR;

  posteCodes(key: UsineKey): string[] {
    return this.data.getAllPosteCodes(key);
  }

  getPoste(key: UsineKey, code: string) {
    return this.data.getPoste(key, code);
  }

  getBasePoste(key: UsineKey, code: string) {
    return (REFS[key]?.postes as Record<string, import('../chiffrage.models').PosteRef> | undefined)?.[code] ?? this.data.getCustomPoste(key, code);
  }

  getOverride(key: UsineKey, code: string) {
    return this.data.overrides()[key]?.[code] ?? {};
  }

  getPrixType(key: UsineKey, code: string): PrixType {
    return this.getOverride(key, code).prix_type ?? 'auto';
  }

  isExpanded(key: string): boolean {
    return !!this.expandedCards()[key];
  }

  toggleCard(key: string): void {
    const cur = this.expandedCards();
    this.expandedCards.set({ ...cur, [key]: !cur[key] });
  }

  onLabelChange(key: UsineKey, code: string, value: string): void {
    const base = this.getBasePoste(key, code);
    this.data.setOverride(key, code, 'label_user', value.trim() === '' ? base?.label_user : value);
  }

  onTooltipChange(key: UsineKey, code: string, value: string): void {
    this.data.setOverride(key, code, 'tooltip', value);
  }

  onVisibleChange(key: UsineKey, code: string, checked: boolean): void {
    this.data.setOverride(key, code, 'visible', checked);
  }

  setPrixMode(key: UsineKey, code: string, mode: PrixType): void {
    if (mode === 'auto') {
      this.data.resetPrix(key, code);
    } else {
      this.data.setOverride(key, code, 'prix_type', mode);
    }
  }

  onPrixFieldChange(
    key: UsineKey,
    code: string,
    field: 'prix_unitaire' | 'ratio_source' | 'ratio_value',
    value: string | number,
  ): void {
    this.data.setOverride(key, code, field, value === '' ? undefined : value);
  }

  resetPoste(key: UsineKey, code: string): void {
    this.data.resetPoste(key, code);
    this.toast.show('✓ Poste réinitialisé');
  }

  resetPrix(key: UsineKey, code: string): void {
    this.data.resetPrix(key, code);
  }

  exportJson(): void {
    const bundle = this.data.exportBundle();
    if (!bundle) {
      this.toast.show('Aucune personnalisation à exporter');
      return;
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chiffrage-overrides.json';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.show('📤 Personnalisations exportées');
  }

  onImportFile(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const ok = this.data.importBundle(JSON.parse(String(reader.result)));
        this.toast.show(ok ? '📥 Personnalisations importées' : '⚠️ Fichier JSON invalide');
      } catch {
        this.toast.show('⚠️ Fichier JSON invalide');
      }
    };
    reader.readAsText(file);
    (ev.target as HTMLInputElement).value = '';
  }

  resetAll(): void {
    if (!confirm('Réinitialiser toutes les personnalisations ?')) return;
    this.data.resetAll();
    this.toast.show('🔄 Tout réinitialisé');
  }

  ratioOptions(key: UsineKey, exclude: string): Array<{ code: string; label: string }> {
    return this.posteCodes(key)
      .filter((c) => c !== exclude)
      .map((c) => {
        const p = this.getBasePoste(key, c);
        return { code: c, label: p?.label_user?.substring(0, 45) ?? c };
      });
  }

  globalFiab(key: UsineKey): string {
    const allN = Object.values(REFS[key].postes).map((p) => p.n || 0);
    const avgN = allN.reduce((a, b) => a + b, 0) / allN.length;
    return avgN >= 10 ? 'haute' : avgN >= 5 ? 'moyenne' : 'faible';
  }
}
