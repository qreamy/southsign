create extension if not exists pgcrypto;

create type public.document_status as enum ('draft','sent','opened','signed','rejected','expired','cancelled');
create type public.member_role as enum ('owner','admin','member');
create type public.signature_method as enum ('drawn','typed','bankid','freja','sms_otp','email_otp');

create table public.organizations(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  retention_days integer not null default 2555 check(retention_days between 1 and 3650),
  created_at timestamptz not null default now()
);
create table public.organization_users(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key(organization_id,user_id)
);
create table public.documents(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status public.document_status not null default 'draft',
  locked_at timestamptz,
  expires_at timestamptz,
  sent_at timestamptz,
  last_opened_at timestamptz,
  signed_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.recipients(
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  full_name text not null,
  company_name text,
  organization_number text,
  email text not null,
  created_at timestamptz not null default now()
);
create table public.document_versions(
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null,
  kind text not null check(kind in ('original','signed')),
  storage_bucket text not null,
  storage_path text not null,
  sha256 text not null check(length(sha256)=64),
  byte_size bigint not null,
  created_at timestamptz not null default now(),
  unique(document_id,version,kind)
);
create table public.signature_requests(
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  recipient_id uuid not null references public.recipients(id) on delete cascade,
  token_hash text not null unique check(length(token_hash)=64),
  expires_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.signatures(
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  recipient_id uuid not null references public.recipients(id),
  method public.signature_method not null,
  signer_name text not null,
  signer_email text not null,
  signature_data text not null,
  terms_accepted boolean not null,
  document_version integer not null,
  ip_address inet,
  user_agent text,
  signed_at timestamptz not null default now()
);
create table public.document_events(
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null,
  created_at timestamptz not null default now()
);
create table public.security_events(
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index documents_org_status_idx on public.documents(organization_id,status,created_at desc);
create index document_events_doc_idx on public.document_events(document_id,id);
create index signature_requests_token_idx on public.signature_requests(token_hash);

create or replace function public.is_org_member(org_id uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_users ou where ou.organization_id=org_id and ou.user_id=auth.uid());
$$;

alter table public.organizations enable row level security;
alter table public.organization_users enable row level security;
alter table public.documents enable row level security;
alter table public.recipients enable row level security;
alter table public.document_versions enable row level security;
alter table public.signature_requests enable row level security;
alter table public.signatures enable row level security;
alter table public.document_events enable row level security;
alter table public.security_events enable row level security;

create policy org_select on public.organizations for select using(public.is_org_member(id));
create policy org_users_select on public.organization_users for select using(user_id=auth.uid() or public.is_org_member(organization_id));
create policy docs_all on public.documents for all using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));
create policy recipients_select on public.recipients for select using(exists(select 1 from public.documents d where d.id=document_id and public.is_org_member(d.organization_id)));
create policy versions_select on public.document_versions for select using(exists(select 1 from public.documents d where d.id=document_id and public.is_org_member(d.organization_id)));
create policy requests_select on public.signature_requests for select using(exists(select 1 from public.documents d where d.id=document_id and public.is_org_member(d.organization_id)));
create policy signatures_select on public.signatures for select using(exists(select 1 from public.documents d where d.id=document_id and public.is_org_member(d.organization_id)));
create policy events_select on public.document_events for select using(exists(select 1 from public.documents d where d.id=document_id and public.is_org_member(d.organization_id)));
create policy security_events_select on public.security_events for select using(organization_id is not null and public.is_org_member(organization_id));

-- App writes event rows only through this function. Direct update/delete is revoked below.
create or replace function public.append_document_event(p_document_id uuid,p_event_type text,p_event_data jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path=public,extensions as $$
declare prev text; eid bigint; ts timestamptz:=clock_timestamp(); h text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_document_id::text,0));
  select event_hash into prev from public.document_events where document_id=p_document_id order by id desc limit 1;
  h:=encode(digest(coalesce(prev,'GENESIS')||'|'||p_document_id::text||'|'||p_event_type||'|'||p_event_data::text||'|'||ts::text,'sha256'),'hex');
  insert into public.document_events(document_id,event_type,event_data,previous_hash,event_hash,created_at) values(p_document_id,p_event_type,p_event_data,prev,h,ts) returning id into eid;
  return eid;
end $$;
revoke update,delete on public.document_events from authenticated,anon;
revoke insert on public.document_events from authenticated,anon;

create or replace function public.prevent_locked_document_mutation() returns trigger language plpgsql as $$
begin
  if old.locked_at is not null and (new.name,new.expires_at,new.organization_id) is distinct from (old.name,old.expires_at,old.organization_id) then raise exception 'signed document is locked'; end if;
  return new;
end $$;
create trigger documents_lock_guard before update on public.documents for each row execute function public.prevent_locked_document_mutation();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('documents-original','documents-original',false,10485760,array['application/pdf']),
 ('documents-signed','documents-signed',false,12582912,array['application/pdf'])
on conflict(id) do nothing;

create policy storage_original_read on storage.objects for select to authenticated using(bucket_id='documents-original' and public.is_org_member((storage.foldername(name))[1]::uuid));
create policy storage_signed_read on storage.objects for select to authenticated using(bucket_id='documents-signed' and public.is_org_member((storage.foldername(name))[1]::uuid));
