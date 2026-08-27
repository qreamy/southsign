create or replace function public.claim_signature_request(p_token_hash text)
returns table(request_id uuid, document_id uuid) language plpgsql security definer set search_path=public as $$
declare r public.signature_requests%rowtype; d public.documents%rowtype;
begin
  select * into r from public.signature_requests where token_hash=p_token_hash for update;
  if not found or r.consumed_at is not null or r.revoked_at is not null then return; end if;
  select * into d from public.documents where id=r.document_id for update;
  if d.status in ('signed','rejected','cancelled','expired') then return; end if;
  if r.expires_at is not null and r.expires_at < now() then
    update public.documents set status='expired',updated_at=now() where id=r.document_id;
    return;
  end if;
  update public.signature_requests set consumed_at=now() where id=r.id;
  request_id:=r.id; document_id:=r.document_id; return next;
end $$;
revoke execute on function public.claim_signature_request(text) from public,anon,authenticated;
