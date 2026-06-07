import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Agency, Audit, AuditTreeNode, LeafRow } from '../audit-commerce.models';
import { AUDIT_TREE, LEAF_KIND, LEAF_NODE, MULTI_LEAVES, NUM_LEAVES } from '../constants/audit-commerce.constants';
import { AuditCommerceDataService } from '../services/audit-commerce-data.service';
import { AuditCommerceUiService } from '../services/audit-commerce-ui.service';
import {
  computeHS,
  computeKpis,
  computeRatios,
  fmtDate,
  isLocked,
  leafTotal,
  leafTotalEmp,
  multiColTotal,
  noteStats,
  uid,
} from '../utils/audit-commerce.utils';
import { AuditComRatiosTableComponent } from './audit-com-ratios-table.component';

@Component({
  selector: 'app-audit-com-audit-form',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, AuditComRatiosTableComponent],
  templateUrl: './audit-com-audit-form.component.html',
})
export class AuditComAuditFormComponent {
  readonly agency = input.required<Agency>();
  readonly audit = input.required<Audit>();

  readonly data = inject(AuditCommerceDataService);
  readonly ui = inject(AuditCommerceUiService);

  readonly tree = AUDIT_TREE;
  readonly kpis = computed(() => computeKpis(this.audit()));
  readonly stats = computed(() => noteStats(this.audit()));
  readonly ro = computed(() => isLocked(this.audit()));

  readonly fmtDate = fmtDate;

  isOpen(id: string): boolean {
    return !this.ui.closedSections().has(id);
  }

  noteOpen(id: string): boolean {
    return this.ui.openNotes().has(id);
  }

  toggleSection(id: string): void {
    this.ui.toggleSection(id);
  }

  toggleNote(id: string): void {
    this.ui.toggleNote(id);
  }

  mutate(fn: (au: Audit) => void): void {
    this.data.mutateAudit(this.agency().id, this.audit().id, fn);
  }

  updateDate(value: string): void {
    this.data.updateAudit(this.agency().id, this.audit().id, { date: value });
  }

  updateLeafText(leafId: string, field: 'text' | 'note', value: string): void {
    this.mutate((au) => {
      au.leaves = au.leaves ?? {};
      const lf = au.leaves[leafId] ?? { text: '', note: '' };
      lf[field] = value;
      au.leaves[leafId] = lf;
    });
  }

  updateLeafNote(leafId: string, value: string): void {
    this.mutate((au) => {
      au.leaves = au.leaves ?? {};
      const lf = au.leaves[leafId] ?? { rows: [], note: '' };
      lf.note = value;
      au.leaves[leafId] = lf;
    });
  }

  updateRow(leafId: string, rowId: string, field: keyof LeafRow, value: string | number): void {
    this.mutate((au) => {
      au.leaves = au.leaves ?? {};
      const lf = au.leaves[leafId] ?? { rows: [], note: '' };
      const row = lf.rows?.find((r) => r.id === rowId);
      if (!row) return;
      if (field === 'val' || field === 'note') {
        (row as LeafRow)[field] = value === '' ? '' : Number(value);
      } else {
        (row as LeafRow)[field] = value as never;
      }
      au.leaves[leafId] = lf;
    });
  }

  updateMultiVal(leafId: string, rowId: string, col: string, value: string): void {
    this.mutate((au) => {
      au.leaves = au.leaves ?? {};
      const lf = au.leaves[leafId] ?? { rows: [], note: '' };
      const row = lf.rows?.find((r) => r.id === rowId);
      if (!row) return;
      row.vals = row.vals ?? {};
      row.vals[col] = value === '' ? '' : Number(value);
      au.leaves[leafId] = lf;
    });
  }

  addRow(leafId: string): void {
    this.mutate((au) => {
      au.leaves = au.leaves ?? {};
      const lf = au.leaves[leafId] ?? { rows: [], note: '' };
      lf.rows = lf.rows ?? [];
      const row: LeafRow = { id: uid(), empId: '', note: '', comment: '' };
      if (LEAF_KIND[leafId] === 'multi') row.vals = {};
      else if (LEAF_KIND[leafId] !== 'qual') row.val = '';
      lf.rows.push(row);
      au.leaves[leafId] = lf;
    });
  }

  delRow(leafId: string, rowId: string): void {
    this.mutate((au) => {
      const lf = au.leaves?.[leafId];
      if (!lf?.rows) return;
      lf.rows = lf.rows.filter((r) => r.id !== rowId);
    });
  }

  leafRows(leafId: string): LeafRow[] {
    return this.audit().leaves?.[leafId]?.rows ?? [];
  }

  leafData(leafId: string) {
    return this.audit().leaves?.[leafId] ?? {};
  }

  leafNode(leafId: string): AuditTreeNode | undefined {
    return LEAF_NODE[leafId];
  }

  numTotal(leafId: string): number {
    return leafTotal(this.audit(), leafId);
  }

  multiTotal(leafId: string, key: string): number {
    return multiColTotal(this.leafRows(leafId), key);
  }

  hsTotal(): number {
    return computeHS(this.audit(), null);
  }

  hsPerEmployee(): Array<{ name: string; v: number }> {
    const au = this.audit();
    return this.agency()
      .employees.filter((e) => {
        return (
          leafTotalEmp(au, 'cli.contact.entrant', e.id) ||
          leafTotalEmp(au, 'cli.contact.traite', e.id) ||
          leafTotalEmp(au, 'cli.contact.relance', e.id)
        );
      })
      .map((e) => ({ name: e.name, v: computeHS(au, e.id) }));
  }

  empRecap(): Array<{ name: string; avg: number }> {
    const st = this.stats();
    return this.agency()
      .employees.filter((e) => st.emp[e.id])
      .map((e) => ({ name: e.name, avg: st.emp[e.id].avg }));
  }

  readonly NUM_LEAVES = NUM_LEAVES;
  readonly MULTI_LEAVES = MULTI_LEAVES;
}
