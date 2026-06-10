import {
  APP_URL,
  EXPEDITEUR,
} from '../constants/ossature.constants';
import { OssatureOrder } from '../ossature.models';

export type SiteEmailResolver = (site: string) => string;
export type FranchiseEmailResolver = (franchise: string) => string;

function siteEmail(site: string, resolve?: SiteEmailResolver): string {
  return resolve?.(site) ?? '';
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 0;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function sendEmailUsine(order: OssatureOrder, resolveSiteEmail?: SiteEmailResolver): void {
  const to = siteEmail(order.site, resolveSiteEmail);
  if (!to) return;
  const sujet = encodeURIComponent(`[NATUREA] Nouvelle demande de devis — ${order.reference}`);
  const corps = encodeURIComponent(
    `Bonjour,

Une nouvelle demande de devis a été déposée sur OssatureTrack.

— DÉTAILS DE LA COMMANDE —
Franchisé : ${order.franchise}
Référence : ${order.reference}
Surface murs : ${order.surface || '—'}
Surface plancher : ${order.plancher || '—'}
Date de livraison souhaitée : ${order.livraison || '—'}
Date dépôt permis : ${order.permis || '—'}
Site de production : ${order.site}

— PIÈCES JOINTES —
${order.docs?.length ? order.docs.join('\n') : 'Aucun document'}

Merci de traiter cette demande dans les meilleurs délais.

Cordialement,
Coordinateur Technique — Réseau Naturéa
${EXPEDITEUR}`,
  );
  window.location.href = `mailto:${to}?cc=${EXPEDITEUR}&subject=${sujet}&body=${corps}`;
}

export function sendAlertDelai(order: OssatureOrder, resolveSiteEmail?: SiteEmailResolver): void {
  const sujet = encodeURIComponent(`[ALERTE NATUREA] Devis en retard — ${order.reference}`);
  const corps = encodeURIComponent(
    `Bonjour,

La commande suivante attend un devis depuis plus de 15 jours.

Franchisé : ${order.franchise}
Référence : ${order.reference}
Site : ${order.site}
Date de demande : ${order.created}
Jours écoulés : ${daysSince(order.created)}

Merci de traiter cette demande en urgence.

🔗 Accéder à l'application : ${APP_URL}

Cordialement,
OssatureTrack — Réseau Naturéa`,
  );
  const cc = siteEmail(order.site, resolveSiteEmail);
  window.location.href = `mailto:${EXPEDITEUR}${cc ? `?cc=${cc}` : '?'}&subject=${sujet}&body=${corps}`;
}

export function sendEmailCommandeConfirmee(order: OssatureOrder, resolveSiteEmail?: SiteEmailResolver): void {
  const usineEmail = siteEmail(order.site, resolveSiteEmail);
  const sujet = encodeURIComponent(`[NATUREA] Commande confirmée — ${order.reference}`);
  const corps = encodeURIComponent(
    `Bonjour,

Le devis a été signé par le franchisé. La commande est confirmée.

— DÉTAILS —
Franchisé : ${order.franchise}
Référence : ${order.reference}
Surface murs : ${order.surface || '—'}
Surface plancher : ${order.plancher || '—'}
Date de livraison souhaitée : ${order.livraison || '—'}
Site de production : ${order.site}
Signé le : ${order.signature_date || '—'} à ${order.signature_heure || '—'}

— PIÈCES JOINTES VALIDATION —
${order.signature_docs?.length ? order.signature_docs.join('\n') : '—'}

Merci de lancer la production.

Cordialement,
OssatureTrack — Réseau Naturéa
${EXPEDITEUR}`,
  );
  window.location.href = `mailto:${EXPEDITEUR}${usineEmail ? `?cc=${usineEmail}` : '?'}&subject=${sujet}&body=${corps}`;
}

export function sendDevisRetourEmail(order: OssatureOrder, resolveFranchiseEmail?: FranchiseEmailResolver): void {
  const franchiseEmail = resolveFranchiseEmail?.(order.franchise) ?? '';
  if (!franchiseEmail) return;
  const subject = encodeURIComponent(`Devis disponible — ${order.reference} (${order.franchise})`);
  const body = encodeURIComponent(
    `Bonjour,

Vous trouverez ci-joint le devis retour pour votre commande :

• Référence : ${order.reference}
• Commande : ${order.id}
• Site de production : ${order.site}

Merci de signer le devis dans les meilleurs délais.

🔗 Accéder à la commande : ${APP_URL}

Cordialement,
${order.site} — Réseau Naturéa`,
  );
  window.location.href = `mailto:${franchiseEmail}?cc=${EXPEDITEUR}&subject=${subject}&body=${body}`;
}

export function sendAlertSignature(order: OssatureOrder): void {
  const sujet = encodeURIComponent(`[ALERTE NATUREA] Signature devis en retard — ${order.reference}`);
  const corps = encodeURIComponent(
    `Bonjour,

Le devis de la commande suivante attend une signature depuis plus de 7 jours.

Franchisé : ${order.franchise}
Référence : ${order.reference}
Site : ${order.site}
Devis déposé le : ${order.devis_retour_date || '—'}
Jours écoulés : ${daysSince(order.devis_retour_date)}

Merci de relancer le franchisé.

🔗 Accéder à l'application : ${APP_URL}

Cordialement,
OssatureTrack — Réseau Naturéa`,
  );
  window.location.href = `mailto:${EXPEDITEUR}?subject=${sujet}&body=${corps}`;
}

export function sendSignatureConfirmEmail(order: OssatureOrder, resolveSiteEmail?: SiteEmailResolver): void {
  const usineEmail = siteEmail(order.site, resolveSiteEmail);
  if (!usineEmail) return;
  const subject = encodeURIComponent(
    `Devis signé — Commande confirmée — ${order.reference} (${order.franchise})`,
  );
  const body = encodeURIComponent(
    `Bonjour,

Le franchisé a signé le devis. La commande est maintenant confirmée.

• Référence : ${order.reference}
• Commande : ${order.id}
• Franchisé : ${order.franchise}
• Site de production : ${order.site}
• Date de signature : ${order.signature_date} à ${order.signature_heure || '—'}

Vous pouvez maintenant préparer le plan de fabrication.

🔗 Accéder à la commande : ${APP_URL}

Cordialement,
${order.franchise} — Réseau Naturéa`,
  );
  window.location.href = `mailto:${usineEmail}?cc=${EXPEDITEUR}&subject=${subject}&body=${body}`;
}

export function sendPlanValidationEmail(order: OssatureOrder, resolveSiteEmail?: SiteEmailResolver): void {
  const usineEmail = siteEmail(order.site, resolveSiteEmail);
  if (!usineEmail) return;
  const subject = encodeURIComponent(
    `Plans de fabrication validés — ${order.reference} (${order.franchise})`,
  );
  const body = encodeURIComponent(
    `Bonjour,

Les plans de fabrication ont été validés et signés par le franchisé.

• Référence : ${order.reference}
• Commande : ${order.id}
• Franchisé : ${order.franchise}
• Date de validation : ${order.plan_val_date} à ${order.plan_val_heure || '—'}

🔗 Accéder à la commande : ${APP_URL}

Cordialement,
${order.franchise} — Réseau Naturéa`,
  );
  window.location.href = `mailto:${usineEmail}?cc=${EXPEDITEUR}&subject=${subject}&body=${body}`;
}

export function sendAlertsRetard(
  orders: OssatureOrder[],
  onDone: (count: number) => void,
  resolveSiteEmail?: SiteEmailResolver,
): void {
  let idx = 0;
  const sendNext = (): void => {
    if (idx >= orders.length) {
      onDone(orders.length);
      return;
    }
    sendAlertDelai(orders[idx++], resolveSiteEmail);
    setTimeout(sendNext, 1500);
  };
  sendNext();
}

export function sendAlertsSig(orders: OssatureOrder[], onDone: (count: number) => void): void {
  let idx = 0;
  const sendNext = (): void => {
    if (idx >= orders.length) {
      onDone(orders.length);
      return;
    }
    sendAlertSignature(orders[idx++]);
    setTimeout(sendNext, 1500);
  };
  sendNext();
}
