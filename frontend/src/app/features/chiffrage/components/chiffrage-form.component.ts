import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FormFieldSchema } from '../chiffrage.models';
import { fmtNum } from '../utils/chiffrage.utils';
import { ChiffrageCharpenteExtComponent } from './chiffrage-charpente-ext.component';
import { ChiffrageTooltipDirective } from '../directives/chiffrage-tooltip.directive';
import { ChiffrageDataService } from '../services/chiffrage-data.service';
import { ChiffrageEstimatorService } from '../services/chiffrage-estimator.service';
import { ChiffrageUiService } from '../services/chiffrage-ui.service';

interface FormSection {
  label: string;
  fields: FormFieldSchema[];
  showExtBanner: boolean;
}

@Component({
  selector: 'app-chiffrage-form',
  standalone: true,
  imports: [FormsModule, ChiffrageCharpenteExtComponent, ChiffrageTooltipDirective],
  templateUrl: './chiffrage-form.component.html',
})
export class ChiffrageFormComponent {
  readonly data = inject(ChiffrageDataService);
  readonly ui = inject(ChiffrageUiService);
  readonly estimator = inject(ChiffrageEstimatorService);

  readonly usine = computed(() => this.ui.currentUsine());
  readonly values = computed(() => this.ui.values());
  readonly manualFields = computed(() => this.ui.manualFields());

  readonly sections = computed(() => this.buildSections());

  fmtNum = fmtNum;

  onFieldInput(fieldId: string, raw: string): void {
    this.ui.setFieldValue(fieldId, parseFloat(raw) || 0);
  }

  fieldValue(fieldId: string): number | '' {
    const v = this.values()[fieldId];
    return v !== undefined && v !== 0 ? v : '';
  }

  isAuto(fieldId: string): boolean {
    const usine = this.usine();
    const isAutoField =
      this.estimator.isAutoFillTarget(usine, fieldId) || this.estimator.isComputedField(usine, fieldId);
    return isAutoField && !this.manualFields().has(fieldId);
  }

  private buildSections(): FormSection[] {
    const usineKey = this.usine();
    const schema = this.data.buildEffectiveSchema(usineKey);
    const map = this.data.getEffectiveFieldMap(usineKey);
    const sections: FormSection[] = [];
    let current: FormSection | null = null;

    const isCharpenteSection = (s: string) => s.toLowerCase().includes('charpente');

    schema.forEach((item) => {
      if (item.section) {
        if (current) sections.push(current);
        current = { label: item.section, fields: [], showExtBanner: false };
      } else if (current && item.id) {
        if (item.ensemble) {
          current.fields.push(item);
          return;
        }
        const fieldMap = map[item.id];
        if (fieldMap) {
          const poste = this.data.getPoste(usineKey, fieldMap.poste);
          if (poste && poste.visible === false) {
            if (isCharpenteSection(current.label)) current.showExtBanner = true;
            return;
          }
        }
        current.fields.push(item);
      }
    });
    if (current) sections.push(current);
    return sections;
  }

  getDisplayLabel(field: FormFieldSchema): string {
    const usineKey = this.usine();
    const map = this.data.getEffectiveFieldMap(usineKey);
    if (!field.id) return field.label || '';
    const fieldMap = map[field.id];
    if (fieldMap) {
      const poste = this.data.getPoste(usineKey, fieldMap.poste);
      if (poste) return poste.label_user;
    }
    return field.label || '';
  }

  getTooltip(field: FormFieldSchema): string {
    const usineKey = this.usine();
    const map = this.data.getEffectiveFieldMap(usineKey);
    if (!field.id) return '';
    const fieldMap = map[field.id];
    if (fieldMap) {
      const poste = this.data.getPoste(usineKey, fieldMap.poste);
      if (poste?.tooltip) return poste.tooltip;
    }
    return '';
  }

  getHint(field: FormFieldSchema): { text: string; visible: boolean; modified: boolean } {
    const usineKey = this.usine();
    if (!field.id) return { text: field.unit || '', visible: true, modified: false };
    const fd = this.data.getFormFieldData(usineKey, field.id);
    const isComputed = this.estimator.isComputedField(usineKey, field.id);
    const computedHint = isComputed
      ? this.estimator.getComputedHint(usineKey, field.id, this.values())
      : null;
    const hintText =
      computedHint != null && computedHint !== ''
        ? computedHint
        : fd.hint
          ? `${field.unit} · ${fd.hint}`
          : field.unit || '';
    return { text: hintText, visible: fd.hint_visible, modified: fd.modified };
  }

  hasPrixBadge(field: FormFieldSchema): { show: boolean; prix: string } {
    const usineKey = this.usine();
    const map = this.data.getEffectiveFieldMap(usineKey);
    if (!field.id) return { show: false, prix: '' };
    const fieldMap = map[field.id];
    if (!fieldMap) return { show: false, prix: '' };
    if (this.data.hasPrixOverride(usineKey, fieldMap.poste)) {
      return { show: true, prix: fmtNum(this.data.getPrixCalcule(usineKey, fieldMap.poste), 2) };
    }
    return { show: false, prix: '' };
  }

  showAutoBadge(field: FormFieldSchema): boolean {
    if (!field.id) return false;
    const usine = this.usine();
    return this.estimator.isAutoFillTarget(usine, field.id) || this.estimator.isComputedField(usine, field.id);
  }
}
