import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';
import { PortalUser } from '../models/user.model';

export function syncSentryUser(user: PortalUser | null): void {
  if (!environment.sentryDsn?.trim()) return;

  if (user) {
    Sentry.setUser({
      id: String(user.id),
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
}
