import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = adminClient();

  const { data: doc } = await db
    .from('documents')
    .select(`
      id,
      name,
      status,
      signed_at,
      created_at,
      recipients(full_name,email),
      document_versions(kind,sha256),
      document_events(event_type,created_at)
    `)
    .eq('id', id)
    .single();

  if (!doc) return notFound();

  const versions = doc.document_versions || [];
  const original = versions.find((v: any) => v.kind === 'original');
  const recipient = Array.isArray(doc.recipients) ? doc.recipients[0] : doc.recipients;
  const events = doc.document_events || [];

  return (
    <main className="shell verify-shell">
      <div className="verify-hero">
        <div className="success-banner">
          <span className="success-icon">✓</span>
          <span>Dokumentet är registrerat som signerat</span>
        </div>

        <div className="card verify-card">
          <div className="verify-header">
            <div>
              <div className="brand">Southbase Sign</div>
              <div className="muted">Verifiering av dokument</div>
            </div>
          </div>

          <div className="verify-title-block">
            <h1>{doc.name}</h1>
            <p className="muted">
              Här kan du verifiera att dokumentet har registrerats i systemet.
            </p>
          </div>

          <div className="verify-grid">
            <div className="verify-item">
              <span className="muted">Dokument-ID</span>
              <strong>{doc.id}</strong>
            </div>

            <div className="verify-item">
              <span className="muted">Signeringsdatum</span>
              <strong>{fmt(doc.signed_at)}</strong>
            </div>

            <div className="verify-item full">
              <span className="muted">SHA-256 fingerprint</span>
              <code>{original?.sha256 || 'Ej tillgänglig'}</code>
            </div>
          </div>

          <div className="verify-note">
            Av integritetsskäl visas inte mottagarens namn, e-postadress, IP-adress
            eller signatur offentligt. Denna verifieringssida bekräftar tjänstens
            registrerade dokument-ID och fingerprint; den är inte ett påstående om
            kvalificerad elektronisk underskrift.
          </div>

          <div className="verify-meta">
            <div className="card">
              <h2>Dokumentstatus</h2>
              <div className="stack">
                <div className="verify-row">
                  <span>Status</span>
                  <span className="badge signed">Signerat</span>
                </div>
                <div className="verify-row">
                  <span>Skapat</span>
                  <span>{fmt(doc.created_at)}</span>
                </div>
                <div className="verify-row">
                  <span>Signerat</span>
                  <span>{fmt(doc.signed_at)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2>Händelser</h2>
              <div className="stack">
                {events.length === 0 ? (
                  <p className="muted">Inga händelser tillgängliga.</p>
                ) : (
                  events.map((e: any, i: number) => (
                    <div className="event" key={i}>
                      <b>{eventLabel(e.event_type)}</b>
                      <div className="muted">{fmt(e.created_at)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="actions" style={{ marginTop: 20 }}>
            <Link href="/" className="btn secondary">
              Till startsidan
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function fmt(v: string | null) {
  return v
    ? new Intl.DateTimeFormat('sv-SE', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date(v))
    : '—';
}

function eventLabel(t: string) {
  return (
    {
      created: 'Dokument skapades',
      sent: 'Dokument skickades',
      opened: 'Signeringslänk öppnades',
      viewed: 'Dokumentet visades',
      terms_accepted: 'Villkoren accepterades',
      signed: 'Dokumentet signerades',
      final_pdf_generated: 'Slutlig PDF genererades',
      rejected: 'Dokumentet avvisades',
      reminder_sent: 'Påminnelse skickades',
      cancelled: 'Förfrågan annullerades',
    } as Record<string, string>
  )[t] || t;
}