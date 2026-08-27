'use client';

import { useMemo, useRef, useState } from 'react';

export default function NewDocumentForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const readableSize = useMemo(() => {
    if (!fileSize) return '';

    if (fileSize < 1024 * 1024) {
      return `${Math.round(fileSize / 1024)} KB`;
    }

    return `${(fileSize / 1024 / 1024).toFixed(1)} MB`;
  }, [fileSize]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setBusy(true);
    setError('');

    try {
      const form = new FormData(e.currentTarget);

      const createResponse = await fetch('/api/documents/create', {
        method: 'POST',
        body: form,
      });

      const createJson = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(
          createJson.error || 'Kunde inte skapa dokumentet'
        );
      }

      const sendResponse = await fetch('/api/documents/send', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          documentId: createJson.documentId,
        }),
      });

      const sendJson = await sendResponse.json();

      if (!sendResponse.ok) {
        throw new Error(
          sendJson.error ||
            'Dokumentet skapades men kunde inte skickas'
        );
      }

      window.location.href = `/dashboard/documents/${createJson.documentId}`;
    } catch (err) {
      setBusy(false);

      setError(
        err instanceof Error
          ? err.message
          : 'Något gick fel. Försök igen.'
      );
    }
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      setFileName('');
      setFileSize(null);
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
  }

  return (
    <form onSubmit={submit}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(280px, 0.55fr)',
          gap: 22,
          alignItems: 'start',
        }}
        className="new-document-layout"
      >
        {/* Formulär */}
        <section className="card panel">
          <div style={{ marginBottom: 24 }}>
            <h2
              className="section-title"
              style={{ marginBottom: 6 }}
            >
              Dokumentuppgifter
            </h2>

            <p
              className="page-subtle"
              style={{
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              Lägg till dokumentet och informationen om personen som
              ska signera.
            </p>
          </div>

          <div className="form-grid">
            {/* Dokumentnamn */}
            <div>
              <label className="label" htmlFor="documentName">
                Dokumentnamn
              </label>

              <input
                className="input"
                id="documentName"
                name="documentName"
                required
                maxLength={160}
                placeholder="Till exempel Partneravtal 2026"
              />
            </div>

            {/* PDF */}
            <div>
              <label className="label">
                PDF-dokument
              </label>

              <input
                ref={fileInputRef}
                name="file"
                type="file"
                accept="application/pdf,.pdf"
                required
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  minHeight: 150,
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 18,
                  background: '#f8fafc',
                  cursor: 'pointer',
                  padding: 24,
                  textAlign: 'center',
                  transition: '0.18s ease',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    margin: '0 auto 12px',
                    borderRadius: 14,
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    color: 'var(--primary)',
                  }}
                >
                  ↑
                </div>

                {fileName ? (
                  <>
                    <div
                      style={{
                        fontWeight: 650,
                        color: 'var(--heading)',
                        marginBottom: 5,
                      }}
                    >
                      {fileName}
                    </div>

                    <div className="page-subtle">
                      {readableSize} · Klicka för att byta fil
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        fontWeight: 650,
                        color: 'var(--heading)',
                        marginBottom: 5,
                      }}
                    >
                      Välj PDF-dokument
                    </div>

                    <div className="page-subtle">
                      Klicka här för att välja en PDF från datorn
                    </div>
                  </>
                )}
              </button>
            </div>

            <div className="divider" />

            {/* Mottagare */}
            <div>
              <h3
                style={{
                  margin: 0,
                  marginBottom: 4,
                  fontSize: 17,
                  color: 'var(--heading)',
                }}
              >
                Mottagare
              </h3>

              <p
                className="page-subtle"
                style={{
                  marginTop: 0,
                  marginBottom: 18,
                }}
              >
                Personen som får den personliga signeringslänken.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
                className="recipient-grid"
              >
                <div>
                  <label
                    className="label"
                    htmlFor="recipientName"
                  >
                    Namn
                  </label>

                  <input
                    className="input"
                    id="recipientName"
                    name="recipientName"
                    required
                    placeholder="För- och efternamn"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="email">
                    E-post
                  </label>

                  <input
                    className="input"
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="namn@företag.se"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="company">
                    Företag
                  </label>

                  <input
                    className="input"
                    id="company"
                    name="company"
                    placeholder="Företagsnamn"
                  />
                </div>

                <div>
                  <label
                    className="label"
                    htmlFor="organizationNumber"
                  >
                    Organisationsnummer
                    <span
                      style={{
                        fontWeight: 400,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {' '}
                      · valfritt
                    </span>
                  </label>

                  <input
                    className="input"
                    id="organizationNumber"
                    name="organizationNumber"
                    placeholder="XXXXXX-XXXX"
                  />
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="label" htmlFor="expiresAt">
                Sista signeringsdatum
                <span
                  style={{
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                  }}
                >
                  {' '}
                  · valfritt
                </span>
              </label>

              <input
                className="input"
                id="expiresAt"
                name="expiresAt"
                type="datetime-local"
              />

              <div
                className="help-text"
                style={{
                  marginTop: 7,
                }}
              >
                Om ett datum anges går signeringslänken inte att använda
                efter denna tidpunkt.
              </div>
            </div>
          </div>
        </section>

        {/* Sidopanel */}
        <aside
          style={{
            display: 'grid',
            gap: 18,
          }}
        >
          <section className="card panel">
            <h2
              className="section-title"
              style={{ marginBottom: 16 }}
            >
              Innan du skickar
            </h2>

            <div
              style={{
                display: 'grid',
                gap: 18,
              }}
            >
              <CheckItem
                title="Privat PDF-lagring"
                text="Originalfilen lagras i en privat bucket och exponeras inte offentligt."
              />

              <CheckItem
                title="Personlig signeringslänk"
                text="Mottagaren får en unik, svårgissad länk som är kopplad till just detta dokument."
              />

              <CheckItem
                title="Audit trail"
                text="Viktiga händelser registreras automatiskt under hela signeringsflödet."
              />

              <CheckItem
                title="Fingerprint"
                text="Dokumentets SHA-256-fingerprint skapas innan signeringen skickas."
              />
            </div>
          </section>

          <section
            className="card panel"
            style={{
              position: 'sticky',
              top: 24,
            }}
          >
            {error && (
              <div
                style={{
                  borderRadius: 14,
                  padding: '12px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: 14,
                  lineHeight: 1.45,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="button button-primary"
              disabled={busy}
              style={{
                width: '100%',
                minHeight: 48,
                opacity: busy ? 0.65 : 1,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {busy
                ? 'Skapar och skickar...'
                : 'Skicka för signering'}
            </button>

            <p
              className="help-text"
              style={{
                textAlign: 'center',
                marginBottom: 0,
              }}
            >
              Mottagaren får ett mejl från Southbase Sign med sin
              personliga signeringslänk.
            </p>
          </section>
        </aside>
      </div>

      <style jsx>{`
        @media (max-width: 850px) {
          .new-document-layout {
            grid-template-columns: 1fr !important;
          }

          .recipient-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </form>
  );
}

function CheckItem({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '30px 1fr',
        gap: 12,
        alignItems: 'start',
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          background: '#eff6ff',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        ✓
      </div>

      <div>
        <div
          style={{
            fontWeight: 650,
            color: 'var(--heading)',
            marginBottom: 3,
          }}
        >
          {title}
        </div>

        <div
          className="help-text"
          style={{
            margin: 0,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}