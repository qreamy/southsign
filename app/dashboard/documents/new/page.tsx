import Link from 'next/link';
import NewDocumentForm from '@/components/NewDocumentForm';
import { requireAdmin } from '@/lib/auth/admin';

export default async function NewDocument() {
  await requireAdmin();

  return (
    <main className="page-shell">
      <div
        className="container"
        style={{
          maxWidth: 980,
        }}
      >
        <header
          style={{
            marginBottom: 26,
          }}
        >
          <Link
            href="/dashboard"
            className="page-subtle"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            ← Tillbaka till dashboard
          </Link>

          <h1 className="page-title">Nytt dokument</h1>

          <p
            className="page-subtle"
            style={{
              marginTop: 9,
              maxWidth: 620,
              lineHeight: 1.55,
            }}
          >
            Ladda upp ett PDF-dokument, ange mottagarens uppgifter och
            skicka en säker signeringsförfrågan.
          </p>
        </header>

        <NewDocumentForm />
      </div>
    </main>
  );
}