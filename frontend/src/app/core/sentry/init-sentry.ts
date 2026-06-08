import { browserTracingIntegration, feedbackIntegration, init } from '@sentry/angular';
import { environment } from '../../../environments/environment';

export function initSentry(): void {
  const dsn = environment.sentryDsn?.trim();
  if (!dsn) {
    console.warn('[Sentry] skipped — missing sentryDsn (run npm run env / set SENTRY_DSN)');
    return;
  }

  init({
    dsn,
    enabled: true,
    debug: !environment.production,
    integrations: [
      browserTracingIntegration(),
      feedbackIntegration({
        autoInject: true,
        colorScheme: 'system',
        triggerLabel: 'Signaler un problème',
        triggerAriaLabel: 'Signaler un problème',
        formTitle: 'Signaler un problème',
        submitButtonLabel: 'Envoyer',
        cancelButtonLabel: 'Annuler',
        confirmButtonLabel: 'Confirmer',
        addScreenshotButtonLabel: 'Ajouter une capture d\'écran',
        removeScreenshotButtonLabel: 'Retirer la capture d\'écran',
        emailLabel: 'E-mail',
        emailPlaceholder: 'votre.email@exemple.org',
        isRequiredLabel: '(obligatoire)',
        messageLabel: 'Description',
        messagePlaceholder: 'Quel est le problème ? Quel était le résultat attendu ?',
        successMessageText: 'Merci pour votre retour !',
        highlightToolText: 'Surligner',
        hideToolText: 'Masquer',
        removeHighlightText: 'Retirer',
      }),
    ],
    tracesSampleRate: environment.production ? 0.2 : 1,
    environment: environment.production ? 'production' : 'development',
  });
}
