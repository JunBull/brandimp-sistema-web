import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  // Capturar el 100% de errores en producción
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
