import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Agency, Audit } from '../audit-commerce.models';
import { AuditCommerceDataService } from '../services/audit-commerce-data.service';
import { AuditCommerceUiService } from '../services/audit-commerce-ui.service';
import { AuditComPrintService } from '../services/audit-com-print.service';
import {
  computeKpis,
  fmtDate,
  isLocked,
  monthAuditsAll,
  monthKpis,
  monthNoteStats,
  noteStats,
  ymLabel,
} from '../utils/audit-commerce.utils';
import { AuditComAuditFormComponent } from './audit-com-audit-form.component';

@Component({
  selector: 'app-audit-com-audit-tab',
  standalone: true,
  imports: [FormsModule, AuditComAuditFormComponent],
  templateUrl: './audit-com-audit-tab.component.html',
})
export class AuditComAuditTabComponent {
  readonly agency = input.required<Agency>();

  readonly data = inject(AuditCommerceDataService);
  readonly ui = inject(AuditCommerceUiService);
  private readonly print = inject(AuditComPrintService);

  readonly ym = computed(() => this.ui.ym());
  readonly currentAudit = computed(() => {
    const id = this.ui.auditId();
    if (!id) return null;
    return this.data.getAudit(this.agency().id, id) ?? null;
  });

  readonly monthList = computed(() =>
    monthAuditsAll(this.agency(), this.ui.ym())
      .filter((au) => au.status !== 'archived')
      .sort((a, b) => b.date.localeCompare(a.date)),
  );

  readonly archives = computed(() =>
    (this.agency().audits ?? [])
      .filter((au) => au.status === 'archived')
      .sort((a, b) => b.date.localeCompare(a.date)),
  );

  readonly monthKpisVal = computed(() => monthKpis(this.agency(), this.ui.ym()));
  readonly monthNote = computed(() => monthNoteStats(this.agency(), this.ui.ym()).agency);
  readonly allMonthCount = computed(() => monthAuditsAll(this.agency(), this.ui.ym()).length);

  readonly fmtDate = fmtDate;
  readonly ymLabel = ymLabel;

  auditKpis(au: Audit) {
    return computeKpis(au);
  }

  auditNote(au: Audit) {
    return noteStats(au).agency;
  }

  isExpanded(id: string): boolean {
    return this.ui.auditExpanded().has(id);
  }

  newAudit(): void {
    const au = this.data.newAudit(this.agency().id, this.ui.ym());
    this.ui.setYm(au.date.slice(0, 7));
    this.ui.auditId.set(au.id);
    this.ui.auditEdit.set(false);
    this.ui.auditExpanded.update((s) => new Set(s).add(au.id));
  }

  openEdit(id: string): void {
    this.ui.auditId.set(id);
    this.ui.auditEdit.set(true);
  }

  backToList(): void {
    this.ui.auditEdit.set(false);
  }

  validate(): void {
    const au = this.currentAudit();
    if (au) this.data.setAuditStatus(this.agency().id, au.id, 'validated');
  }

  reopen(): void {
    const au = this.currentAudit();
    if (au) this.data.setAuditStatus(this.agency().id, au.id, 'draft');
  }

  archive(): void {
    const au = this.currentAudit();
    if (au) this.data.setAuditStatus(this.agency().id, au.id, 'archived');
  }

  unarchive(): void {
    const au = this.currentAudit();
    if (au) this.data.setAuditStatus(this.agency().id, au.id, 'validated');
  }

  confirmDelete(id: string): void {
    this.ui.confirmDeleteAuditId.set(id);
  }

  doDelete(): void {
    const id = this.ui.confirmDeleteAuditId();
    if (!id) return;
    this.data.deleteAudit(this.agency().id, id);
    if (this.ui.auditId() === id) {
      this.ui.auditId.set(this.data.resolveDefaultAuditId(this.agency().id, this.ui.ym()));
    }
    this.ui.auditEdit.set(false);
    this.ui.confirmDeleteAuditId.set(null);
  }

  exportPdf(audit?: Audit): void {
    const au = audit ?? this.currentAudit();
    if (au) this.print.exportAuditPDF(this.agency(), au);
  }

  updateDate(value: string): void {
    const au = this.currentAudit();
    if (au) this.data.updateAudit(this.agency().id, au.id, { date: value });
  }

  toggleArch(): void {
    this.ui.archOpen.update((v) => !v);
  }

  locked(): boolean {
    return isLocked(this.currentAudit());
  }
}
