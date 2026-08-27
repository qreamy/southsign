'use client';

import { useState } from 'react';
import SignaturePad from './SignaturePad';

export default function SignForm({
  token,
  recipientName,
}: {
  token: string;
  recipientName: string;
}) {
  const [fullName, setFullName] = useState(recipientName);
  const [mode, setMode] = useState<'drawn' | 'typed'>('drawn');

  const [drawn, setDrawn] = useState('');
  const [typed, setTyped] = useState(recipientName);

  const [accepted, setAccepted] = useState(false);

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function sign() {
    setBusy(true);
    setMessage('');

    const signatureData =
      mode === 'drawn' ? drawn : typed;

    const response = await fetch('/api/documents/sign', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        token,
        fullName,
        signatureType: mode,
        signatureData,
        accepted,
      }),
    });

    const json = await response.json();

    setBusy(false);

    if (!response.ok) {
      setMessage(
        json.error || 'Signeringen kunde inte genomföras.'
      );
      return;
    }

    window.location.href = json.verifyUrl;
  }

  async function reject() {
    setBusy(true);
    setMessage('');

    const response = await fetch('/api/documents/reject', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        token,
        reason,
      }),
    });

    const json = await response.json();

    setBusy(false);

    if (!response.ok) {
      setMessage(
        json.error || 'Dokumentet kunde inte avvisas.'
      );
      return;
    }

    setMessage('Dokumentet har avvisats.');
  }

  const canSign =
    !busy &&
    accepted &&
    fullName.trim().length > 1 &&
    (mode === 'typed'
      ? typed.trim().length > 1
      : drawn.length > 0);

  return (
    <div
      className="card panel"
      style={{
        padding: 30,
      }}
    >
      <div
        style={{
          marginBottom: 26,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: '#eff6ff',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            marginBottom: 16,
          }}
        >
          ✍
        </div>

        <h2
          className="section-title"
          style={{
            fontSize: '1.55rem',
            marginBottom: 6,
          }}
        >
          Signera dokumentet
        </h2>

        <p
          className="page-subtle"
          style={{
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          Bekräfta ditt namn och välj hur du vill skapa din
          elektroniska signatur.
        </p>
      </div>

      <div className="form-grid">
        {/* Name */}
        <div>
          <label
            htmlFor="signerFullName"
            className="label"
          >
            Fullständigt namn
          </label>

          <input
            id="signerFullName"
            className="input"
            value={fullName}
            onChange={(event) =>
              setFullName(event.target.value)
            }
            placeholder="För- och efternamn"
          />
        </div>

        {/* Signature mode */}
        <div>
          <label className="label">
            Signatur
          </label>

          <div
            style={{
              padding: 5,
              borderRadius: 14,
              background: '#f1f5f9',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 5,
            }}
          >
            <button
              type="button"
              onClick={() => setMode('drawn')}
              style={{
                border: 0,
                borderRadius: 11,
                padding: '11px 15px',
                cursor: 'pointer',
                fontWeight: 650,
                background:
                  mode === 'drawn'
                    ? '#fff'
                    : 'transparent',
                color:
                  mode === 'drawn'
                    ? 'var(--heading)'
                    : 'var(--text-muted)',
                boxShadow:
                  mode === 'drawn'
                    ? '0 1px 4px rgba(15,23,42,.08)'
                    : 'none',
              }}
            >
              Rita signatur
            </button>

            <button
              type="button"
              onClick={() => setMode('typed')}
              style={{
                border: 0,
                borderRadius: 11,
                padding: '11px 15px',
                cursor: 'pointer',
                fontWeight: 650,
                background:
                  mode === 'typed'
                    ? '#fff'
                    : 'transparent',
                color:
                  mode === 'typed'
                    ? 'var(--heading)'
                    : 'var(--text-muted)',
                boxShadow:
                  mode === 'typed'
                    ? '0 1px 4px rgba(15,23,42,.08)'
                    : 'none',
              }}
            >
              Skriven signatur
            </button>
          </div>
        </div>

        {/* Actual signature */}
        {mode === 'drawn' ? (
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 18,
              overflow: 'hidden',
              background: '#fff',
              padding: 14,
            }}
          >
            <div
              className="page-subtle"
              style={{
                marginBottom: 10,
                fontSize: 13,
              }}
            >
              Rita din signatur i fältet nedan med mus eller finger.
            </div>

            <SignaturePad onChange={setDrawn} />
          </div>
        ) : (
          <div>
            <label
              className="label"
              htmlFor="typedSignature"
            >
              Signaturtext
            </label>

            <input
              id="typedSignature"
              className="input"
              value={typed}
              onChange={(event) =>
                setTyped(event.target.value)
              }
            />

            <div
              style={{
                marginTop: 12,
                minHeight: 130,
                border: '1px solid #e2e8f0',
                borderRadius: 18,
                background: '#fafcff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                fontSize: 40,
                fontStyle: 'italic',
                fontFamily: 'Georgia, serif',
                color: '#111827',
                textAlign: 'center',
              }}
            >
              {typed || 'Din signatur'}
            </div>
          </div>
        )}

        <div className="divider" />

        {/* Consent */}
        <label
          style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr',
            gap: 13,
            alignItems: 'start',
            padding: 18,
            borderRadius: 16,
            border: accepted
              ? '1px solid #93c5fd'
              : '1px solid #e2e8f0',
            background: accepted
              ? '#eff6ff'
              : '#fafafa',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) =>
              setAccepted(event.target.checked)
            }
            style={{
              width: 19,
              height: 19,
              marginTop: 1,
              accentColor: 'var(--primary)',
            }}
          />

          <div>
            <div
              style={{
                fontWeight: 650,
                color: 'var(--heading)',
                marginBottom: 4,
              }}
            >
              Jag godkänner dokumentet
            </div>

            <div
              className="help-text"
              style={{
                margin: 0,
              }}
            >
              Jag bekräftar att jag har läst dokumentet och
              godkänner dess innehåll.
            </div>
          </div>
        </label>

        {message && (
          <div
            style={{
              padding: '13px 15px',
              borderRadius: 14,
              background:
                message.includes('avvisats')
                  ? '#f0fdf4'
                  : '#fef2f2',
              border:
                message.includes('avvisats')
                  ? '1px solid #bbf7d0'
                  : '1px solid #fecaca',
              color:
                message.includes('avvisats')
                  ? '#166534'
                  : '#b91c1c',
              fontSize: 14,
            }}
          >
            {message}
          </div>
        )}

        <button
          type="button"
          className="button button-primary"
          disabled={!canSign}
          onClick={sign}
          style={{
            width: '100%',
            minHeight: 52,
            fontSize: 16,
            opacity: canSign ? 1 : 0.5,
            cursor: canSign ? 'pointer' : 'not-allowed',
          }}
        >
          {busy
            ? 'Bearbetar signering...'
            : 'Signera dokument'}
        </button>

        <div
          style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          När du signerar registreras tidpunkt och teknisk
          verifieringsinformation för dokumentet.
        </div>

        <div className="divider" />

        {/* Reject */}
        {!rejecting ? (
          <button
            type="button"
            onClick={() => setRejecting(true)}
            style={{
              border: 0,
              background: 'transparent',
              color: '#b91c1c',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 8,
            }}
          >
            Jag vill inte signera detta dokument
          </button>
        ) : (
          <div
            style={{
              borderRadius: 18,
              border: '1px solid #fecaca',
              background: '#fffafa',
              padding: 18,
            }}
          >
            <h3
              style={{
                margin: '0 0 5px',
                color: 'var(--heading)',
                fontSize: 16,
              }}
            >
              Avvisa dokument
            </h3>

            <p
              className="help-text"
              style={{
                marginTop: 0,
              }}
            >
              Ange gärna varför du väljer att inte signera.
            </p>

            <textarea
              className="textarea"
              rows={4}
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              placeholder="Anledning till avvisandet..."
            />

            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 12,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="button button-danger"
                disabled={
                  busy ||
                  reason.trim().length < 2
                }
                onClick={reject}
              >
                Bekräfta avvisning
              </button>

              <button
                type="button"
                className="button button-secondary"
                onClick={() =>
                  setRejecting(false)
                }
              >
                Avbryt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}