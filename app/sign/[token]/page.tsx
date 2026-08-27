import { notFound } from 'next/navigation';

import { adminClient } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/security/crypto';
import { signedStorageUrl } from '@/lib/storage';
import { appendEvent } from '@/lib/audit';

import PdfViewer from '@/components/PdfViewer';
import SignForm from '@/components/SignForm';

export const dynamic = 'force-dynamic';

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const db = adminClient();

  const { data: reqRow } = await db
    .from('signature_requests')
    .select(`
      id,
      document_id,
      expires_at,
      consumed_at,
      revoked_at,
      opened_at,
      documents(
        id,
        name,
        status,
        organization_id,
        document_versions(
          storage_bucket,
          storage_path,
          kind,
          version
        ),
        recipients(
          full_name,
          email
        )
      )
    `)
    .eq('token_hash', hashToken(token))
    .single();

  if (!reqRow) {
    return notFound();
  }

  const doc: any = reqRow.documents;

  if (
    reqRow.revoked_at ||
    reqRow.consumed_at ||
    ['signed', 'rejected', 'cancelled'].includes(doc.status)
  ) {
    return (
      <StatusPage
        title="Länken är inte längre aktiv"
        text="Dokumentet har redan behandlats eller signeringsförfrågan har annullerats."
      />
    );
  }

  if (
    reqRow.expires_at &&
    new Date(reqRow.expires_at) < new Date()
  ) {
    await db
      .from('documents')
      .update({ status: 'expired' })
      .eq('id', doc.id);

    return (
      <StatusPage
        title="Signeringslänken har gått ut"
        text="Tiden för att signera dokumentet har passerat. Kontakta avsändaren om du behöver en ny signeringsförfrågan."
      />
    );
  }

  const { data: org } = await db
    .from('organizations')
    .select('name')
    .eq('id', doc.organization_id)
    .single();

  const version = doc.document_versions.find(
    (item: any) => item.kind === 'original'
  );

  if (!version) {
    return notFound();
  }

  const recipient = Array.isArray(doc.recipients)
    ? doc.recipients[0]
    : doc.recipients;

  const pdfUrl = await signedStorageUrl(
    version.storage_path,
    'documents-original',
    900
  );

  const now = new Date().toISOString();

  await db
    .from('signature_requests')
    .update({
      opened_at: reqRow.opened_at || now,
    })
    .eq('id', reqRow.id);

  await db
    .from('documents')
    .update({
      status: doc.status === 'sent' ? 'opened' : doc.status,
      last_opened_at: now,
    })
    .eq('id', doc.id);

  await appendEvent(doc.id, 'opened', {});
  await appendEvent(doc.id, 'viewed', {
    version: version.version,
  });

  const sender =
    org?.name ||
    process.env.NEXT_PUBLIC_APP_NAME ||
    'Southbase Sign';

  return (
    <main className="page-shell">
      {/* Top navigation */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e8edf4',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            minHeight: 72,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <img
              src="/southbase.png"
              alt="Southbase Sign"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                objectFit: 'contain',
              }}
            />

            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 750,
                  letterSpacing: '-0.02em',
                  color: 'var(--heading)',
                }}
              >
                Southbase Sign
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  marginTop: 1,
                }}
              >
                Säker elektronisk signering
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--success)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'var(--success)',
              }}
            />
            Säker anslutning
          </div>
        </div>
      </div>

      <div
        className="container"
        style={{
          maxWidth: 1280,
          paddingTop: 32,
        }}
      >
        {/* Document heading */}
        <section
          className="card panel"
          style={{
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 24,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '7px 11px',
                  fontWeight: 650,
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                Dokument för signering
              </div>

              <h1
                className="page-title"
                style={{
                  fontSize: '2rem',
                }}
              >
                {doc.name}
              </h1>

              <p
                className="page-subtle"
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  lineHeight: 1.55,
                }}
              >
                Läs igenom hela dokumentet innan du signerar.
              </p>
            </div>

            <div
              style={{
                minWidth: 230,
                display: 'grid',
                gap: 10,
                fontSize: 14,
              }}
            >
              <MetaRow label="Avsändare" value={sender} />
              <MetaRow
                label="Mottagare"
                value={recipient?.full_name || '—'}
              />
            </div>
          </div>
        </section>

        {/* PDF */}
        <section
          className="card panel"
          style={{
            marginBottom: 22,
          }}
        >
          <div
            style={{
              marginBottom: 18,
            }}
          >
            <h2
              className="section-title"
              style={{
                marginBottom: 5,
              }}
            >
              Granska dokumentet
            </h2>

            <p
              className="page-subtle"
              style={{
                margin: 0,
              }}
            >
              Bläddra mellan sidorna och använd zoom-knapparna vid
              behov.
            </p>
          </div>

          <div className="viewer-shell">
            <PdfViewer url={pdfUrl} />
          </div>
        </section>

        {/* Signing */}
        <section
          style={{
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          <SignForm
            token={token}
            recipientName={recipient.full_name}
          />
        </section>

        <footer
          style={{
            padding: '34px 0 10px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <span>Southbase Sign</span>

          <span>
            Elektronisk signering • Dokument-ID {doc.id}
          </span>
        </footer>
      </div>
    </main>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 18,
      }}
    >
      <span
        style={{
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: 'var(--heading)',
          fontWeight: 600,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusPage({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <main className="page-shell">
      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
          padding: '100px 22px',
        }}
      >
        <div
          className="card panel"
          style={{
            textAlign: 'center',
            padding: 42,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              margin: '0 auto 20px',
              borderRadius: 16,
              background: '#eff6ff',
              color: 'var(--primary)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: 24,
            }}
          >
            ✓
          </div>

          <h1
            className="page-title"
            style={{
              fontSize: '1.8rem',
            }}
          >
            {title}
          </h1>

          <p
            className="page-subtle"
            style={{
              lineHeight: 1.6,
              marginTop: 12,
            }}
          >
            {text}
          </p>
        </div>
      </div>
    </main>
  );
}