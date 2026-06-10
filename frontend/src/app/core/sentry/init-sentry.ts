import { browserTracingIntegration, feedbackIntegration, init } from '@sentry/angular';
import { assertAppEnvironment } from '../config/assert-app-environment';
import { environment } from '../../../environments/environment';

export function initSentry(): void {
  assertAppEnvironment();

  init({
    dsn: environment.sentryDsn,
    enabled: true,
    release: environment.sentryRelease,
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
        addScreenshotButtonLabel: "Ajouter une capture d'écran",
        removeScreenshotButtonLabel: "Retirer la capture d'écran",
        emailLabel: 'E-mail',
        emailPlaceholder: 'votre.email@exemple.org',
        isRequiredLabel: '(obligatoire)',
        messageLabel: 'Description',
        messagePlaceholder: 'Quel est le problème ? Quel était le résultat attendu ?',
        successMessageText: 'Merci pour votre retour !',
        highlightToolText: 'Surligner',
        hideToolText: 'Masquer',
        removeHighlightText: 'Retirer',
        useSentryUser: { email: 'email', name: 'username' },
      }),
    ],
    tracesSampleRate: environment.production ? 0.2 : 1,
    environment: environment.production ? 'production' : 'development',
  });
}
