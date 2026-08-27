# Southbase Sign — MVP

A production-oriented MVP for ordinary electronic signatures: upload PDF → recipient → secure link → review → sign/reject → immutable original + signed PDF → audit trail → verification.

> **Legal scope:** This MVP implements ordinary electronic signatures. It does **not** claim to provide qualified electronic signatures (QES), eIDAS certification, BankID assurance, or Scrive-equivalent certifications. The authentication layer is intentionally modular so BankID/Freja/SMS/e-mail OTP can be added later.

## Stack

- Next.js 16.3.3 / App Router / TypeScript
- Supabase Postgres + Auth + private Storage
- `@supabase/ssr` for cookie-based admin auth
- PDF.js (`pdfjs-dist`) for browser PDF rendering
- `pdf-lib` for the appended signature certificate page
- Resend for transactional e-mail
- Vercel-compatible server routes

## Included

- Organization-isolated admin dashboard with status, search/filter and metrics
- Password-based Supabase admin login
- PDF upload (10 MB max, PDF MIME + magic-byte validation)
- Recipient/company/org.no./expiry metadata
- 256-bit random signing tokens
- SHA-256 token lookup + AES-256-GCM encrypted token copy for authorized admins
- Private Supabase buckets + short-lived signed URLs
- Drawn and typed signatures
- Explicit acceptance checkbox
- Reject flow with reason
- IP/User-Agent capture on signing/rejection (review your privacy notice/legal basis before enabling in production)
- Original and final PDF SHA-256 fingerprints
- Append-only chained audit-event hashes
- Atomic one-use token claim for signing
- Signed-document locking guard
- Signed PDF with appended verification/certificate page
- Signing, reminder and completion e-mails
- Signed PDF attached to recipient completion e-mail
- Public privacy-minimized `/verify/[document-id]`
- Retention helper for GDPR purge jobs
- Server-side JSON export endpoint and explicit document deletion endpoint
- Security headers, input validation, same-origin CSRF checks for cookie-authenticated mutations and basic rate limiting

## 1. Create Supabase project

Create a project and run all files in `supabase/migrations/` in numeric order via the SQL editor or Supabase CLI.

Create your first admin in **Authentication → Users**, then run the bootstrap SQL shown in `002_bootstrap_notes.sql` with the generated Auth user UUID.

The migrations create private Storage buckets:

- `documents-original`
- `documents-signed`

## 2. Environment

Copy:

```bash
cp .env.example .env.local
```

Fill in all variables. Generate the two token secrets independently, for example:

```bash
openssl rand -base64 48
```

`SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_PEPPER`, `TOKEN_ENCRYPTION_KEY` and `RESEND_API_KEY` must never be exposed to the browser.

## 3. Resend

Create a Resend API key and verify a sender domain. Set `RESEND_FROM_EMAIL` to a verified sender. If `RESEND_API_KEY` is omitted locally, the app logs the signing URL server-side instead of sending it.

## 4. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000/auth/login`.

## 5. Vercel deployment

1. Push this directory to a Git repository.
2. Import it in Vercel as a Next.js project.
3. Add every variable from `.env.example` in Vercel Project Settings → Environment Variables.
4. Set `NEXT_PUBLIC_APP_URL` to the production HTTPS URL.
5. Deploy.
6. In Supabase Auth URL configuration, add the production URL to allowed redirect/site URLs.

## Security architecture

### Tenant authorization

Every administrator belongs to an organization through `organization_users`. Admin queries are constrained by `organization_id`; RLS independently enforces membership for authenticated access.

### Signing token

The URL contains a 32-byte cryptographically random token. The database uses a peppered SHA-256 hash for lookup. The raw token is also stored encrypted with AES-256-GCM **only** so an authorized admin can copy/resend the same active link. It is never stored in plaintext.

### One-use signing

`claim_signature_request()` locks the request and document row and atomically marks the token consumed. A second signing attempt cannot claim the same request.

### Audit trail

`append_document_event()` serializes events per document using an advisory transaction lock. Each event hashes the previous event hash + document ID + event type + JSON data + database timestamp. Authenticated/anonymous roles cannot update/delete/insert event rows directly.

This provides tamper evidence, not an external trusted timestamp. For stronger evidence later, periodically anchor event-chain roots in an external immutable timestamp/log service.

### PDF hash note

The original PDF hash is included in the appended signing certificate. The **final PDF's own SHA-256 cannot correctly be embedded inside itself** because writing the hash changes the file and therefore changes the hash. The final fingerprint is computed after serialization and stored in `document_versions`, the audit trail and the public verification page.

### Rate limiting

The MVP includes a per-instance in-memory limiter. This is useful locally but **must be replaced with a shared store** such as Upstash Redis/Vercel KV before serious multi-instance production traffic.

## GDPR checklist before production

The schema minimizes public exposure, but your organization remains responsible for legal basis, privacy information, processor agreements, retention settings and data-subject workflows.

- Configure `organizations.retention_days` to your documented policy.
- Run a scheduled purge job: call `documents_due_for_purge()`, delete both private Storage objects, then delete the document row.
- Export: query the document, recipient, signature, versions and events by document ID on the server and package only necessary data.
- Deletion: remove Storage objects first, then the document row (related metadata cascades).
- IP address should only be retained if you have a documented purpose/legal basis; otherwise remove it from `signatures`/rejection metadata.
- Never expose signature data, IP or e-mail on `/verify`.

## Recommended production hardening before external launch

1. Replace in-memory rate limiting with shared Redis/KV.
2. Add malware/file scanning before accepting uploaded PDFs.
3. Add asynchronous retry/outbox handling for e-mail and signed-PDF generation failures.
4. Add external timestamp/audit anchoring.
5. Add Sentry/structured logging with PII redaction.
6. Add admin MFA.
7. Add CSRF origin checks for cookie-authenticated mutation routes (same-site cookies + CSP already help, but explicit Origin validation is recommended).
8. Add automated integration tests against an isolated Supabase project.
9. Add recipient identity modules (BankID/Freja/OTP) through a `SignatureIdentityProvider` adapter rather than changing document logic.

## Future eID adapter shape

Suggested interface:

```ts
type IdentityResult = {
  provider: 'bankid' | 'freja' | 'sms_otp' | 'email_otp';
  subjectId?: string;
  assuranceLevel?: string;
  verifiedAt: string;
  evidence: Record<string, unknown>;
};

interface SignatureIdentityProvider {
  begin(input: { documentId: string; recipientId: string }): Promise<{ challengeId: string }>;
  verify(challengeId: string): Promise<IdentityResult>;
}
```

Keep provider evidence in a separate table in a later migration; do not mix provider-specific fields into `signatures`.
