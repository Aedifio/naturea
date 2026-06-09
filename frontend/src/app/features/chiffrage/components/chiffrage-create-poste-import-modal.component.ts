import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ImportPreviewPoste, UsineKey } from '../chiffrage.models';
import { REFS } from '../constants/chiffrage-refs.constants';
import { ChiffrageDataService } from '../services/chiffrage-data.service';
import { ChiffrageToastService } from '../services/chiffrage-toast.service';
import { fmtEurR, fmtNum } from '../utils/chiffrage.utils';

type ModalMode = 'new' | 'link';

@Component({
  selector: 'app-chiffrage-create-poste-import-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chiffrage-create-poste-import-modal.component.html',
})
export class ChiffrageCreatePosteImportModalComponent {
  private readonly data = inject(ChiffrageDataService);
  private readonly toast = inject(ChiffrageToastService);

  readonly open = signal(false);
  readonly usineKey = signal<UsineKey | null>(null);
  readonly posteIndex = signal(-1);
  readonly poste = signal<ImportPreviewPoste | null>(null);
  readonly mode = signal<ModalMode>('new');

  readonly label = signal('');
  readonly unite = signal('m²');
  readonly section = signal('');
  readonly newSectionName = signal('');
  readonly prix = signal(0);
  readonly tooltip = signal('');
  readonly linkCode = signal('');

  private onDone: ((code: string) => void) | null = null;

  fmtNum = fmtNum;
  fmtEurR = fmtEurR;

  openFor(
    usineKey: UsineKey,
    posteIndex: number,
    poste: ImportPreviewPoste,
    onDone: (code: string) => void,
  ): void {
    this.usineKey.set(usineKey);
    this.posteIndex.set(posteIndex);
    this.poste.set(poste);
    this.onDone = onDone;
    this.mode.set('new');
    this.label.set(poste.label_pdf);
    this.unite.set(this.normalizeUnite(poste.unite));
    this.prix.set(poste.pu);
    this.tooltip.set('');
    this.linkCode.set('');
    const sections = this.data.getUsineSections(usineKey);
    this.section.set(sections[0] ?? '');
    this.newSectionName.set('');
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.onDone = null;
  }

  setMode(mode: ModalMode): void {
    this.mode.set(mode);
  }

  onSectionChange(value: string): void {
    this.section.set(value);
  }

  usineNom(): string {
    const key = this.usineKey();
    return key ? this.data.getUsineLabel(key) : '';
  }

  sections(): string[] {
    const key = this.usineKey();
    return key ? this.data.getUsineSections(key) : [];
  }

  existingPostes(): Array<{ code: string; label: string; custom: boolean }> {
    const key = this.usineKey();
    if (!key) return [];
    const base = Object.entries(REFS[key].postes).map(([code, p]) => ({
      code,
      label: p.label_user,
      custom: false,
    }));
    const custom = Object.entries(this.data.customPostes()[key] ?? {}).map(([code, p]) => ({
      code,
      label: p.label_user,
      custom: true,
    }));
    return [...base, ...custom];
  }

  submit(): void {
    const key = this.usineKey();
    if (!key) return;

    if (this.mode() === 'link') {
      const code = this.linkCode();
      if (!code) {
        this.toast.show('⚠️ Choisis un poste existant');
        return;
      }
      this.finish(code);
      return;
    }

    let section = this.section();
    if (section === '__new__') {
      section = this.newSectionName().trim();
      if (!section) {
        this.toast.show('⚠️ Donne un nom à la nouvelle section');
        return;
      }
    }

    const label = this.label().trim();
    const unite = this.unite();
    const prix = this.prix();
    if (!label) {
      this.toast.show('⚠️ Le libellé est obligatoire');
      return;
    }
    if (prix <= 0) {
      this.toast.show('⚠️ Le prix unitaire doit être > 0');
      return;
    }

    const code = this.data.generatePosteCode(key, label);
    const type = this.data.deduceMappingType(unite);
    const fieldId = this.data.generateFieldId(key, code, unite);
    const uniteRef =
      unite === 'm²' || unite === 'm³' || unite === 'ml' || unite === 'u'
        ? `€/${unite}`
        : unite === 'forfait'
          ? 'forfait'
          : `€/${unite}`;

    this.data.addCustomPoste(key, code, {
      label_user: label,
      label_pdf: this.poste()?.label_pdf ?? label,
      tooltip: this.tooltip(),
      unite: uniteRef,
      moyen: prix,
      form_field: {
        field_id: fieldId,
        type,
        section,
        unit: unite,
        hint: this.poste()
          ? `Détecté depuis import (${fmtNum(prix, 2)} €/${unite})`
          : '',
      },
    });

    this.toast.show(`✓ Poste « ${label} » créé pour ${this.data.getUsineLabel(key)}`);
    this.finish(code);
  }

  private finish(code: string): void {
    this.onDone?.(code);
    this.close();
  }

  private normalizeUnite(u: string): string {
    const up = (u || '').toUpperCase();
    if (up === 'M2' || up === 'M²') return 'm²';
    if (up === 'M3' || up === 'M³') return 'm³';
    if (up === 'ML') return 'ml';
    if (up === 'U') return 'u';
    if (up === 'ENS' || up === 'FRT' || up === 'FORFAIT') return 'forfait';
    return u.toLowerCase();
  }
}
