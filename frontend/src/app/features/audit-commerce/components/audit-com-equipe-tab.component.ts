import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Agency } from '../audit-commerce.models';
import { AuditCommerceDataService } from '../services/audit-commerce-data.service';
import { AuditCommerceUiService } from '../services/audit-commerce-ui.service';
import { empPointNotes, fmtDate, isLocked, noteStats } from '../utils/audit-commerce.utils';

@Component({
  selector: 'app-audit-com-equipe-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './audit-com-equipe-tab.component.html',
})
export class AuditComEquipeTabComponent {
  readonly agency = input.required<Agency>();

  readonly data = inject(AuditCommerceDataService);
  readonly ui = inject(AuditCommerceUiService);

  readonly currentAudit = computed(() => {
    const id = this.ui.auditId();
    if (!id) return null;
    return this.data.getAudit(this.agency().id, id) ?? null;
  });

  readonly stats = computed(() => noteStats(this.currentAudit()));

  readonly fmtDate = fmtDate;

  addEmployee(): void {
    this.data.addEmployee(this.agency().id);
  }

  updateEmployee(empId: string, field: 'name' | 'role', value: string): void {
    this.data.updateEmployee(this.agency().id, empId, field, value);
  }

  deleteEmployee(empId: string): void {
    this.data.deleteEmployee(this.agency().id, empId);
  }

  updateRating(empId: string, comment: string): void {
    const au = this.currentAudit();
    if (!au) return;
    this.data.mutateAudit(this.agency().id, au.id, (a) => {
      a.empRatings = a.empRatings ?? {};
      a.empRatings[empId] = { ...a.empRatings[empId], comment };
    });
  }

  empNotes(empId: string) {
    const au = this.currentAudit();
    return au ? empPointNotes(au, empId) : [];
  }

  locked(): boolean {
    return isLocked(this.currentAudit());
  }
}
