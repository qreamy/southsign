-- GDPR-oriented retention helper. Schedule this daily with Supabase Cron/pg_cron if desired.
-- Storage objects must be deleted by an Edge Function/server job BEFORE rows are removed.
create or replace function public.documents_due_for_purge()
returns table(document_id uuid, organization_id uuid, original_path text, signed_path text)
language sql security definer set search_path=public as $$
  select d.id,d.organization_id,
    max(v.storage_path) filter(where v.kind='original'),
    max(v.storage_path) filter(where v.kind='signed')
  from public.documents d
  join public.organizations o on o.id=d.organization_id
  left join public.document_versions v on v.document_id=d.id
  where d.created_at < now() - make_interval(days=>o.retention_days)
  group by d.id,d.organization_id;
$$;
revoke execute on function public.documents_due_for_purge() from public,anon,authenticated;
