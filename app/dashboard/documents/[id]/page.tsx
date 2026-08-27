import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireAdmin } from '@/lib/auth/admin';
import { signedStorageUrl } from '@/lib/storage';
import PdfViewer from '@/components/PdfViewer';
import DocumentActions from '@/components/DocumentActions';

const statusSv: Record<string, string> = {
  draft: 'Utkast',
  sent: 'Skickat',
  opened: 'Öppnat',
  signed: 'Signerat',
  rejected: 'Avvisat',
  expired: 'Utgånget',
  cancelled: 'Annullerat',
};

function statusClass(status: string) {
  switch (status) {
    case 'signed':
      return 'badge-signed';
    case 'sent':
      return 'badge-sent';
    case 'opened':
      return 'badge-opened';
    case 'draft':
      return 'badge-draft';
    case 'rejected':
      return 'badge-declined';
    case 'expired':
      return 'badge-expired';
    case 'cancelled':
      return 'badge-cancelled';
    default:
      return 'badge-draft';
  }
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { supabase, organizationId } = await requireAdmin();

  const { data: doc } = await supabase
    .from('documents')
    .select(
      `
        *,
        recipients(*),
        document_versions(*),
        document_events(*)
      `
    )
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (!doc) {
    return notFound();
  }

  const recipient: any = Array.isArray(doc.recipients)
    ? doc.recipients[0]
    : doc.recipients;

  const versions: any[] = doc.document_versions || [];

  const original = versions.find((version) => version.kind === 'original');
  const signed = versions.find((version) => version.kind === 'signed');

  const originalUrl = original
    ? await signedStorageUrl(
        original.storage_path,
        'documents-original',
        900
      )
    : null;

  const signedUrl = signed
    ? await signedStorageUrl(
        signed.storage_path,
        'documents-signed',
        900
      )
    : null;

  const events = [...(doc.document_events || [])].sort(
    (a: any, b: any) => a.id - b.id
  );

  return (
    <main className="page-shell">
      <div className="container">
        {/* Header */}
        <header
          className="topbar"
          style={{
            alignItems: 'flex-start',
            marginBottom: 24,
          }}
        >
          <div>
            <Link
              href="/dashboard"
              className="page-subtle"
              style={{
                display: 'inline-flex',
                marginBottom: 14,
              }}
            >
              ← Tillbaka till dashboard
            </Link>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <h1 className="page-title">{doc.name}</h1>

              <span
                className={`badge ${statusClass(doc.status)}`}
              >
                {statusSv[doc.status] || doc.status}
              </span>
            </div>

            <p
              className="page-subtle"
              style={{
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              Dokument-ID: {doc.id}
            </p>
          </div>

          <DocumentActions
            documentId={doc.id}
            status={doc.status}
          />
        </header>

        {/* Dokument + information */}
        <div className="split-layout">
          <section className="stack">
            {originalUrl && (
              <div className="card panel">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <h2
                      className="section-title"
                      style={{ marginBottom: 5 }}
                    >
                      Dokument
                    </h2>

                    <div className="page-subtle">
                      Originalversionen som skickades för signering
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <a
                      className="button button-secondary"
                      href={originalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Öppna original
                    </a>

                    {signedUrl && (
                      <a
                        className="button button-primary"
                        href={signedUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ladda ner signerad PDF
                      </a>
                    )}
                  </div>
                </div>

                <div className="viewer-shell">
                  <PdfViewer url={originalUrl} />
                </div>
              </div>
            )}
          </section>

          <aside
            style={{
              display: 'grid',
              gap: 20,
              alignContent: 'start',
            }}
          >
            {/* Information */}
            <section className="card panel">
              <h2 className="section-title">Information</h2>

              <div className="info-list">
                <InfoItem
                  label="Mottagare"
                  value={recipient?.full_name || '—'}
                  secondary={recipient?.email}
                />

                <InfoItem
                  label="Företag"
                  value={recipient?.company_name || '—'}
                />

                {recipient?.organization_number && (
                  <InfoItem
                    label="Organisationsnummer"
                    value={recipient.organization_number}
                  />
                )}

                <InfoItem
                  label="Skickat"
                  value={formatDate(doc.sent_at)}
                />

                <InfoItem
                  label="Senast öppnat"
                  value={formatDate(doc.last_opened_at)}
                />

                <InfoItem
                  label="Signerat"
                  value={formatDate(doc.signed_at)}
                />
              </div>

              <div className="divider" />

              <Link
                href={`/verify/${doc.id}`}
                className="button button-secondary"
                style={{
                  width: '100%',
                }}
              >
                Öppna verifieringssida
              </Link>
            </section>

            {/* Fingerprints */}
            <section className="card panel">
              <h2 className="section-title">Fingerprints</h2>

              <div className="info-list">
                {original && (
                  <HashItem
                    label="Original PDF"
                    value={original.sha256}
                  />
                )}

                {signed && (
                  <HashItem
                    label="Signerad PDF"
                    value={signed.sha256}
                  />
                )}
              </div>

              <p
                className="help-text"
                style={{
                  marginTop: 18,
                  marginBottom: 0,
                }}
              >
                SHA-256 används för att upptäcka om dokumentets innehåll
                har förändrats efter registrering.
              </p>
            </section>

            {/* Audit trail */}
            <section className="card panel">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div>
                  <h2
                    className="section-title"
                    style={{ marginBottom: 4 }}
                  >
                    Audit trail
                  </h2>

                  <div className="page-subtle">
                    {events.length} registrerade händelser
                  </div>
                </div>
              </div>

              {events.length > 0 ? (
                <div>
                  {events.map((event: any, index: number) => (
                    <div
                      key={event.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '14px 1fr',
                        gap: 12,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: 999,
                            background: 'var(--primary)',
                            marginTop: 6,
                            zIndex: 2,
                          }}
                        />

                        {index !== events.length - 1 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 15,
                              bottom: -16,
                              width: 1,
                              background: '#e2e8f0',
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          paddingBottom:
                            index === events.length - 1 ? 0 : 22,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 650,
                            color: 'var(--heading)',
                            marginBottom: 4,
                          }}
                        >
                          {eventLabel(event.event_type)}
                        </div>

                        <div className="page-subtle">
                          {formatDate(event.created_at)}
                        </div>

                        <details
                          style={{
                            marginTop: 7,
                          }}
                        >
                          <summary
                            style={{
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              fontSize: 12,
                            }}
                          >
                            Visa tekniska detaljer
                          </summary>

                          <div
                            style={{
                              marginTop: 8,
                              padding: 10,
                              borderRadius: 10,
                              background: '#f8fafc',
                              border: '1px solid #eef2f7',
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              wordBreak: 'break-all',
                              lineHeight: 1.45,
                            }}
                          >
                            Event hash:
                            <br />
                            {event.event_hash}
                          </div>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="page-subtle">
                  Inga händelser registrerade ännu.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoItem({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string | null;
}) {
  return (
    <div className="info-item">
      <h4>{label}</h4>

      <div
        style={{
          color: 'var(--heading)',
          fontWeight: 550,
        }}
      >
        {value}
      </div>

      {secondary && (
        <div
          style={{
            marginTop: 3,
            color: 'var(--text-muted)',
          }}
        >
          {secondary}
        </div>
      )}
    </div>
  );
}

function HashItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="info-item">
      <h4>{label}</h4>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: '#f8fafc',
          border: '1px solid #eef2f7',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 11,
          wordBreak: 'break-all',
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
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
  };

  return labels[type] || type;
}