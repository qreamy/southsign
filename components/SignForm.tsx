'use client';

import { useState } from 'react';

export default function SignForm({
  token,
  recipientName,
}: {
  token: string;
  recipientName: string;
}) {
  const [fullName, setFullName] = useState(recipientName);
  const [accepted, setAccepted] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function sign() {
    setBusy(true);
    setMsg('');

    const r = await fetch('/api/documents/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token,
        fullName,
        signatureType: 'typed',
        signatureData: fullName,
        accepted,
      }),
    });

    const j = await r.json();
    setBusy(false);

    if (!r.ok) {
      return setMsg(j.error || 'Signeringen misslyckades');
    }

    window.location.href = j.verifyUrl;
  }

  async function reject() {
    setBusy(true);
    setMsg('');

    const r = await fetch('/api/documents/reject', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, reason }),
    });

    const j = await r.json();
    setBusy(false);

    if (!r.ok) {
      return setMsg(j.error || 'Dokumentet kunde inte avvisas');
    }

    setMsg('Dokumentet har avvisats.');
  }

  return (
    <div className="card stack">
      <div>
        <h2>Signera dokument</h2>
        <p className="muted">
          Bekräfta dokumentet genom att skriva ditt fullständiga namn.
        </p>
      </div>

      <div className="field">
        <label>Fullständigt namn</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ange ditt fullständiga namn"
        />
      </div>

      <div className="field">
        <label>Signatur</label>
        <div className="sign-area sigtyped">{fullName || 'Din signatur visas här'}</div>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>Jag har läst dokumentet och godkänner innehållet.</span>
      </label>

      {msg && (
        <div className={msg.includes('misslyck') || msg.includes('kunde inte') ? 'error' : 'notice'}>
          {msg}
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          className="btn"
          disabled={busy || !accepted || !fullName.trim()}
          onClick={sign}
        >
          {busy ? 'Bearbetar…' : 'Signera dokument'}
        </button>

        <button
          type="button"
          className="btn danger"
          onClick={() => setRejecting((v) => !v)}
        >
          Avvisa dokumentet
        </button>
      </div>

      {rejecting && (
        <div className="stack">
          <div className="field">
            <label>Anledning</label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Skriv anledning"
            />
          </div>

          <button
            type="button"
            className="btn danger"
            disabled={busy || reason.trim().length < 2}
            onClick={reject}
          >
            Bekräfta avvisning
          </button>
        </div>
      )}
    </div>
  );
}