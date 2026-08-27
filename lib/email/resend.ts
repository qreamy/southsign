import { Resend } from 'resend';

const appName =
  process.env.NEXT_PUBLIC_APP_NAME || 'Southbase Sign';

const from =
  process.env.RESEND_FROM_EMAIL ||
  'Southbase Sign <onboarding@resend.dev>';

function client() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendSigningEmail(
  to: string,
  name: string,
  documentName: string,
  link: string
) {
  const resend = client();

  if (!resend) {
    console.error('RESEND_API_KEY saknas');
    throw new Error('RESEND_API_KEY_MISSING');
  }

  console.log('Sending signing email', {
    from,
    to,
    documentName,
    link,
  });

  const result = await resend.emails.send({
    from,
    to,
    subject: `Dokument för signering: ${documentName}`,
    html: `
      <div style="
        font-family:Arial,Helvetica,sans-serif;
        max-width:600px;
        margin:0 auto;
        padding:40px 30px;
        color:#0f172a;
      ">
        <div style="
          font-size:22px;
          font-weight:700;
          margin-bottom:28px;
        ">
          Southbase Sign
        </div>

        <h2 style="
          font-size:24px;
          margin:0 0 18px;
        ">
          Du har fått ett dokument för elektronisk signering
        </h2>

        <p>Hej ${escapeHtml(name)},</p>

        <p style="line-height:1.6;">
          Dokumentet <strong>${escapeHtml(documentName)}</strong>
          väntar på din granskning och signering.
        </p>

        <p style="margin:28px 0;">
          <a
            href="${link}"
            style="
              display:inline-block;
              background:#2563eb;
              color:#ffffff;
              padding:14px 20px;
              border-radius:10px;
              text-decoration:none;
              font-weight:700;
            "
          >
            Granska och signera
          </a>
        </p>

        <p style="
          color:#64748b;
          font-size:13px;
          line-height:1.5;
        ">
          Länken är personlig och ska inte vidarebefordras.
        </p>

        <p style="
          color:#64748b;
          font-size:13px;
          margin-top:30px;
        ">
          ${appName}
        </p>
      </div>
    `,
  });

  if (result.error) {
    console.error('RESEND SEND ERROR:', result.error);
    throw new Error(
      `RESEND_ERROR: ${result.error.message}`
    );
  }

  console.log('Resend email sent successfully', {
    id: result.data?.id,
    to,
  });

  return result.data;
}

export async function sendSignedConfirmation(
  to: string,
  documentName: string,
  verifyUrl: string,
  pdf?: Buffer
) {
  const resend = client();

  if (!resend) {
    throw new Error('RESEND_API_KEY_MISSING');
  }

  const result = await resend.emails.send({
    from,
    to,
    subject: `Signering klar: ${documentName}`,
    html: `
      <div style="
        font-family:Arial,Helvetica,sans-serif;
        max-width:600px;
        margin:0 auto;
        padding:40px 30px;
        color:#0f172a;
      ">
        <h2>Dokumentet är signerat</h2>

        <p>
          ${escapeHtml(documentName)} har signerats elektroniskt.
        </p>

        <p>
          <a href="${verifyUrl}">
            Verifiera dokumentet
          </a>
        </p>
      </div>
    `,
    attachments: pdf
      ? [
          {
            filename:
              `${documentName.replace(
                /[^a-zA-Z0-9_-]+/g,
                '_'
              )}-signerad.pdf`,
            content: pdf,
          },
        ]
      : undefined,
  });

  if (result.error) {
    console.error(
      'RESEND SIGNED CONFIRMATION ERROR:',
      result.error
    );

    throw new Error(
      `RESEND_ERROR: ${result.error.message}`
    );
  }

  return result.data;
}

export async function sendAdminConfirmation(
  documentName: string,
  documentId: string
) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const resend = client();

  if (!to || !resend) {
    return;
  }

  const result = await resend.emails.send({
    from,
    to,
    subject: `Signerad: ${documentName}`,
    html: `
      <p>
        Dokumentet <strong>${escapeHtml(documentName)}</strong>
        har signerats.
      </p>

      <p>
        Dokument-ID: ${documentId}
      </p>
    `,
  });

  if (result.error) {
    console.error(
      'RESEND ADMIN CONFIRMATION ERROR:',
      result.error
    );

    throw new Error(
      `RESEND_ERROR: ${result.error.message}`
    );
  }

  return result.data;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character]!
  );
}