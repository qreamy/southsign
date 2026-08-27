import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/admin';

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

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}) {
  const { supabase, organizationId } = await requireAdmin();
  const sp = await searchParams;

  const { data } = await supabase
    .from('documents')
    .select(
      `
        id,
        name,
        status,
        sent_at,
        last_opened_at,
        signed_at,
        created_at,
        recipients(
          full_name,
          company_name,
          email
        )
      `
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  const allDocuments = data || [];

  const total = allDocuments.length;

  const waiting = allDocuments.filter((document: any) =>
    ['sent', 'opened'].includes(document.status)
  ).length;

  const signed = allDocuments.filter(
    (document: any) => document.status === 'signed'
  ).length;

  const completedOrWaiting = waiting + signed;

  const rate =
    completedOrWaiting > 0
      ? Math.round((signed / completedOrWaiting) * 100)
      : 0;

  let documents = [...allDocuments];

  if (sp.status) {
    documents = documents.filter(
      (document: any) => document.status === sp.status
    );
  }

  if (sp.q) {
    const search = sp.q.toLowerCase();

    documents = documents.filter((document: any) => {
      const recipient = Array.isArray(document.recipients)
        ? document.recipients[0]
        : document.recipients;

      return (
        document.name?.toLowerCase().includes(search) ||
        recipient?.full_name?.toLowerCase().includes(search) ||
        recipient?.company_name?.toLowerCase().includes(search) ||
        recipient?.email?.toLowerCase().includes(search)
      );
    });
  }

  return (
    <main className="page-shell">
      <div className="container">
        {/* Header */}
        <header className="topbar">
          <div className="brand">
            <div>
              <h1>
                {process.env.NEXT_PUBLIC_APP_NAME || 'Southbase Sign'}
              </h1>
              <p>Dokument och signeringar</p>
            </div>
          </div>

          <Link
            href="/dashboard/documents/new"
            className="button button-primary"
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>+</span>
            Nytt dokument
          </Link>
        </header>

        {/* Statistik */}
        <section className="stat-grid">
          <div className="card stat-card">
            <div className="stat-label">Alla dokument</div>
            <div className="stat-value">{total}</div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              Totalt skapade
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-label">Väntar på signering</div>
            <div className="stat-value">{waiting}</div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              Skickade eller öppnade
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-label">Signerade</div>
            <div className="stat-value">{signed}</div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              Slutförda dokument
            </div>
          </div>

          <div className="card stat-card">
            <div className="stat-label">Signeringsgrad</div>
            <div className="stat-value">{rate}%</div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              Av skickade dokument
            </div>
          </div>
        </section>

        {/* Dokument */}
        <section className="card panel table-shell">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
              marginBottom: 22,
            }}
          >
            <div>
              <h2 className="section-title" style={{ marginBottom: 5 }}>
                Dokument
              </h2>

              <div className="page-subtle">
                Hantera signeringsförfrågningar och följ deras status.
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              Visar {documents.length} av {total}
            </div>
          </div>

          {/* Filter */}
          <form className="table-toolbar">
            <input
              className="input"
              name="q"
              defaultValue={sp.q}
              placeholder="Sök dokument, mottagare eller företag..."
              style={{
                maxWidth: 360,
              }}
            />

            <select
              className="select"
              name="status"
              defaultValue={sp.status || ''}
              style={{
                width: 'auto',
                minWidth: 175,
              }}
            >
              <option value="">Alla statusar</option>

              {Object.entries(statusSv).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>

            <button className="button button-secondary" type="submit">
              Filtrera
            </button>

            {(sp.q || sp.status) && (
              <Link
                href="/dashboard"
                className="button button-secondary"
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                Rensa
              </Link>
            )}
          </form>

          {/* Table */}
          {documents.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Dokument</th>
                    <th>Mottagare</th>
                    <th>Företag</th>
                    <th>E-post</th>
                    <th>Skickat</th>
                    <th>Status</th>
                    <th>Senast öppnat</th>
                    <th>Signerat</th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map((document: any) => {
                    const recipient = Array.isArray(document.recipients)
                      ? document.recipients[0]
                      : document.recipients;

                    return (
                      <tr key={document.id}>
                        <td>
                          <Link
                            href={`/dashboard/documents/${document.id}`}
                            style={{
                              fontWeight: 650,
                              color: 'var(--heading)',
                            }}
                          >
                            {document.name}
                          </Link>
                        </td>

                        <td>{recipient?.full_name || '—'}</td>

                        <td>{recipient?.company_name || '—'}</td>

                        <td
                          style={{
                            color: 'var(--text-muted)',
                          }}
                        >
                          {recipient?.email || '—'}
                        </td>

                        <td>{formatDate(document.sent_at)}</td>

                        <td>
                          <span
                            className={`badge ${statusClass(
                              document.status
                            )}`}
                          >
                            {statusSv[document.status] || document.status}
                          </span>
                        </td>

                        <td>{formatDate(document.last_opened_at)}</td>

                        <td>{formatDate(document.signed_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  marginBottom: 12,
                }}
              >
                ◇
              </div>

              <div
                style={{
                  fontWeight: 650,
                  marginBottom: 5,
                }}
              >
                Inga dokument hittades
              </div>

              <div className="page-subtle">
                Prova att ändra din sökning eller skapa ett nytt dokument.
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer
          style={{
            marginTop: 28,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          <span>Southbase Sign</span>
          <span>Elektronisk dokumenthantering</span>
        </footer>
      </div>
    </main>
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
  }).format(new Date(value));
}