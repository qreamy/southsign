alter table public.signature_requests add column if not exists token_ciphertext text;
comment on column public.signature_requests.token_ciphertext is 'AES-GCM encrypted raw token used only to let authorized admins copy/resend the active link. token_hash remains the lookup key.';
