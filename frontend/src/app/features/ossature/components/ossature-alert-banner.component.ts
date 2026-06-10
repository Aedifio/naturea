import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { FactoryService } from '../../../core/services/factory.service';
import { OssatureDataService } from '../services/ossature-data.service';
import { sendAlertsRetard, sendAlertsSig } from '../utils/ossature-email.util';
import { OssatureToastService } from '../services/ossature-toast.service';

@Component({
  selector: 'app-ossature-alert-banner',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="banner-alerte">
        <div class="banner-alerte-hd">
          <span>⚠️ {{ total() }} alerte{{ total() > 1 ? 's' : '' }} en retard</span>
          <button type="button" class="banner-close" (click)="dismiss()">✕</button>
        </div>
        @if (enRetardDevis().length) {
          <div class="banner-row">
            <span>📋 {{ enRetardDevis().length }} devis usine en retard (+15j)</span>
            <button type="button" class="btn-alert red" (click)="alertDevis()">📧 Alerter</button>
          </div>
        }
        @if (enRetardPlans().length) {
          <div class="banner-row">
            <span>📐 {{ enRetardPlans().length }} plan(s) fabrication en retard (+15j)</span>
          </div>
        }
        @if (enRetardSig().length) {
          <div class="banner-row">
            <span>✍️ {{ enRetardSig().length }} signature franchisé en retard (+7j)</span>
            <button type="button" class="btn-alert amber" (click)="alertSig()">📧 Alerter</button>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .banner-alerte {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a2236;
      color: #fff;
      border-radius: 14px;
      padding: 14px 22px;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 540px;
      width: 90%;
    }
    .banner-alerte-hd {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .banner-close {
      background: transparent;
      color: #9ca3af;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
    }
    .banner-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 13px;
    }
    .btn-alert {
      border: none;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      color: #fff;
    }
    .btn-alert.red {
      background: #ef4444;
    }
    .btn-alert.amber {
      background: #f59e0b;
    }
  `,
})
export class OssatureAlertBannerComponent {
  private readonly auth = inject(AuthService);
  private readonly data = inject(OssatureDataService);
  private readonly factory = inject(FactoryService);
  private readonly toast = inject(OssatureToastService);

  readonly dismissed = signal(false);
  readonly enRetardDevis = computed(() => this.data.ordersEnRetardDevis());
  readonly enRetardSig = computed(() => this.data.ordersEnRetardSig());
  readonly enRetardPlans = computed(() => this.data.ordersEnRetardPlans());
  readonly total = computed(
    () => this.enRetardDevis().length + this.enRetardSig().length + this.enRetardPlans().length,
  );
  readonly visible = computed(
    () =>
      this.auth.isAdministrator() &&
      !this.dismissed() &&
      this.total() > 0 &&
      this.data.orders().length > 0,
  );

  dismiss(): void {
    this.dismissed.set(true);
  }

  alertDevis(): void {
    const list = this.enRetardDevis();
    if (!list.length) {
      this.toast.show('✅ Aucune commande en retard');
      return;
    }
    sendAlertsRetard(list, (count) => {
      this.toast.show(`✅ ${count} alerte(s) envoyée(s)`);
      this.dismiss();
    }, (site) => this.factory.getEmailForOssatureSite(site));
  }

  alertSig(): void {
    const list = this.enRetardSig();
    if (!list.length) {
      this.toast.show('✅ Aucune signature en retard');
      return;
    }
    sendAlertsSig(list, (count) => {
      this.toast.show(`✅ ${count} alerte(s) signature envoyée(s)`);
    });
  }
}
