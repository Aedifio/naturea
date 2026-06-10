import { Component, computed, inject } from '@angular/core';
import { AuditCommerceDataService } from '../services/audit-commerce-data.service';
import { AuditCommerceUiService } from '../services/audit-commerce-ui.service';

@Component({
  selector: 'app-audit-com-settings-modal',
  standalone: true,
  templateUrl: './audit-com-settings-modal.component.html',
})
export class AuditComSettingsModalComponent {
  readonly data = inject(AuditCommerceDataService);
  readonly ui = inject(AuditCommerceUiService);

  readonly noteThreshold = computed(() => this.data.settings().noteThreshold);

  onThresholdInput(e: Event): void {
    const v = Number((e.target as HTMLInputElement).value);
    this.data.updateSettings({ noteThreshold: v });
  }

  exportBackup(): void {
    void this.data.exportBackup();
  }

  importBackup(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    void this.data.importBackup(f).then((n) => {
      alert(`Sauvegarde restaurée : ${n} agence(s).`);
      this.ui.closeSettings();
    }).catch((err) => alert(`Import impossible : ${err.message || err}`));
    (e.target as HTMLInputElement).value = '';
  }

  close(): void {
    this.ui.closeSettings();
  }

  closeBg(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-bg')) this.close();
  }
}
