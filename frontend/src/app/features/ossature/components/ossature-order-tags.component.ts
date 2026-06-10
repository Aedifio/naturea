import { Component, input } from '@angular/core';
import {
  arLivraisonDepasse,
  devisDelaiDepasse,
  planFabDelaiDepasse,
  signatureDelaiDepasse,
} from '../services/ossature-data.service';
import { OssatureOrder } from '../ossature.models';

@Component({
  selector: 'app-ossature-order-tags',
  standalone: true,
  template: `
    @if (!order().plan_val_signature && order().statut === 'Commande confirmée') {
      <span class="tag plan">⏳ Plan à valider</span>
    }
    @if (order().statut === 'Devis envoyé' && !order().signature) {
      <span class="tag sign">✍️ Devis en attente de signature</span>
    }
    @if (devisDelaiDepasse(order())) {
      <span class="tag delay">⚠️ +15j</span>
    }
    @if (signatureDelaiDepasse(order())) {
      <span class="tag sig-delay">✍️ +7j</span>
    }
    @if (arLivraisonDepasse(order())) {
      <span class="tag ar-delay">🚛 Livraison dépassée</span>
    }
    @if (planFabDelaiDepasse(order())) {
      <span class="tag plan-delay">📐 Plans +15j</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }
    .tag {
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .tag.plan {
      background: #fff7ed;
      color: #92400e;
      border-radius: 20px;
    }
    .tag.sign {
      background: #eef2ff;
      color: #3b6fe8;
      border-radius: 20px;
    }
    .tag.delay {
      background: #fef2f2;
      color: #dc2626;
    }
    .tag.sig-delay {
      background: #fff3cd;
      color: #856404;
    }
    .tag.ar-delay {
      background: #fee2e2;
      color: #991b1b;
    }
    .tag.plan-delay {
      background: #fff3cd;
      color: #856404;
    }
  `,
})
export class OssatureOrderTagsComponent {
  readonly order = input.required<OssatureOrder>();
  readonly devisDelaiDepasse = devisDelaiDepasse;
  readonly signatureDelaiDepasse = signatureDelaiDepasse;
  readonly arLivraisonDepasse = arLivraisonDepasse;
  readonly planFabDelaiDepasse = planFabDelaiDepasse;
}
