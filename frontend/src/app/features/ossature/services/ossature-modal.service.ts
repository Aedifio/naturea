import { Injectable, signal } from '@angular/core';
import { SignatureMode } from '../ossature.models';

export type NewOrderContext = 'franchise' | 'coord';

@Injectable({ providedIn: 'root' })
export class OssatureModalService {
  readonly detailOrderId = signal<string | null>(null);
  readonly newOrderOpen = signal(false);
  readonly newOrderContext = signal<NewOrderContext>('franchise');
  readonly signatureOrderId = signal<string | null>(null);
  readonly signatureMode = signal<SignatureMode>('devis');

  openDetail(orderId: string): void {
    this.detailOrderId.set(orderId);
  }

  closeDetail(): void {
    this.detailOrderId.set(null);
  }

  openNewOrder(context: NewOrderContext = 'franchise'): void {
    this.newOrderContext.set(context);
    this.newOrderOpen.set(true);
  }

  closeNewOrder(): void {
    this.newOrderOpen.set(false);
  }

  openSignature(orderId: string, mode: SignatureMode = 'devis'): void {
    this.signatureOrderId.set(orderId);
    this.signatureMode.set(mode);
  }

  closeSignature(): void {
    this.signatureOrderId.set(null);
  }
}
