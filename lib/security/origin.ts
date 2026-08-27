export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');

  // Server-to-server / vissa browser requests kan sakna Origin.
  if (!origin) return;

  const configuredAppUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const allowedOrigins = new Set<string>();

  // Primär app-URL
  allowedOrigins.add(new URL(configuredAppUrl).origin);

  // Lokal utveckling
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
  }

  // Vercel production/preview host
  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    allowedOrigins.add(`https://${vercelUrl}`);
  }

  // Kontrollera även den faktiska host-headern.
  const forwardedHost =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host');

  const forwardedProto =
    req.headers.get('x-forwarded-proto') ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  if (forwardedHost) {
    allowedOrigins.add(
      `${forwardedProto}://${forwardedHost}`
    );
  }

  if (!allowedOrigins.has(origin)) {
    console.warn('Blocked origin', {
      origin,
      allowedOrigins: Array.from(allowedOrigins),
    });

    throw new Error('BAD_ORIGIN');
  }
}