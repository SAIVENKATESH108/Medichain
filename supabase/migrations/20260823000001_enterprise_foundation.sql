-- ==============================================================================
-- MediChain Verify — Enterprise Foundation Schema Migration
-- Migration ID: 20260823000001_enterprise_foundation.sql
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 2. ENUM TYPES
do $$ begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type public.org_role as enum ('owner', 'admin', 'pharmacist', 'regulator', 'manufacturer', 'member');
  end if;
  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type public.review_status as enum ('pending_review', 'approved', 'rejected', 'amended');
  end if;
  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type public.submission_status as enum ('draft', 'internal_reviewed', 'ready_for_external_filing', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'model_provider') then
    create type public.model_provider as enum ('groq', 'openrouter', 'mock', 'custom');
  end if;
end $$;

-- 3. ORGANIZATIONS & MULTI-TENANCY
create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  tier text default 'standard' check (tier in ('standard', 'enterprise', 'regulator')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.organization_members (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.org_role not null default 'member',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, user_id)
);

-- Helper function to check org membership & roles in RLS
create or replace function public.is_org_member(p_org_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.organization_members
    where organization_id = p_org_id and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

create or replace function public.has_org_role(p_org_id uuid, p_roles public.org_role[])
returns boolean as $$
begin
  return exists (
    select 1 from public.organization_members
    where organization_id = p_org_id
      and user_id = auth.uid()
      and role = any(p_roles)
  );
end;
$$ language plpgsql security definer;

-- 4. API KEYS & RATE LIMITING
create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  report_id text,
  feedback_type text not null,
  message text not null,
  created_at timestamptz default now()
);

-- 11b. QUARANTINED BATCHES & DISPOSITION
create table if not exists public.quarantined_batches (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  vault_id text not null unique,
  medicine_name text not null,
  batch_number text not null,
  manufacturer text not null,
  units_quarantined integer not null default 0,
  interception_reason text not null,
  status text not null default 'ISOLATED' check (status in ('ISOLATED', 'UNDER_TESTING', 'DESTROYED', 'RELEASED_CLEARED')),
  disposition_officer text not null,
  cdsco_case_no text not null,
  quarantine_date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 11c. STATUTORY DRUG SCHEDULES (CDSCO)
create table if not exists public.drug_schedules (
  id uuid default gen_random_uuid() primary key,
  schedule text not null unique check (schedule in ('H', 'H1', 'X', 'G', 'C', 'C1', 'J')),
  title text not null,
  description text not null,
  requires_prescription boolean default true,
  mandatory_warning_label text not null,
  gsr_reference text,
  sample_drugs text[] default array[]::text[],
  created_at timestamptz default now()
);

-- 11d. CIRCUIT BREAKER PERSISTENCE
create table if not exists public.circuit_breaker_state (
  provider_model_key text primary key,
  failure_count integer not null default 0,
  last_failure_time timestamptz,
  circuit_status text not null default 'CLOSED' check (circuit_status in ('CLOSED', 'HALF_OPEN', 'OPEN')),
  updated_at timestamptz default now()
);

create table if not exists public.api_keys (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] default array['verify:read', 'verify:write'],
  rate_limit_rpm integer default 60,
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.rate_limit_usage (
  id uuid default gen_random_uuid() primary key,
  key_id uuid references public.api_keys(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  window_minute timestamptz not null,
  request_count integer default 1,
  unique(organization_id, key_id, window_minute)
);

-- 5. OPENFDA & EXTERNAL API CACHE
create table if not exists public.openfda_cache (
  cache_key text primary key,
  query_type text not null check (query_type in ('ndc_lookup', 'recalls', 'manufacturer')),
  medicine_query text not null,
  response_data jsonb not null,
  status_code integer not null default 200,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists idx_openfda_cache_expires on public.openfda_cache(expires_at);

-- 6. AI MODEL ROUTING & TELEMETRY LOG
create table if not exists public.ai_model_routing_log (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  task_type text not null check (task_type in ('content_safety', 'vision_analysis', 'database_crossref', 'risk_assessment', 'chat_assistant')),
  provider public.model_provider not null,
  model text not null,
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  latency_ms integer not null,
  cost_estimate_usd numeric(8, 6) default 0.0,
  fallback_triggered boolean default false,
  fallback_reason text,
  status text not null check (status in ('success', 'rate_limited', 'provider_error', 'fallback_success', 'guardrail_blocked')),
  created_at timestamptz default now()
);

create index if not exists idx_ai_model_routing_created on public.ai_model_routing_log(created_at desc);
create index if not exists idx_ai_model_routing_org on public.ai_model_routing_log(organization_id);

-- 7. TAMPER-EVIDENT HASH-CHAINED AUDIT LOG
create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  sequence_number bigserial not null,
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  action text not null,
  resource_type text not null,
  resource_id text,
  canonical_payload jsonb not null,
  previous_hash text not null,
  current_hash text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_audit_log_org on public.audit_log(organization_id);
create index if not exists idx_audit_log_seq on public.audit_log(sequence_number);

-- IMMUTABILITY ENFORCEMENT ON AUDIT LOG
create or replace function public.enforce_audit_log_immutability()
returns trigger as $$
begin
  raise exception 'audit_log rows are immutable: UPDATE and DELETE operations are forbidden.';
end;
$$ language plpgsql;

drop trigger if exists trg_audit_log_immutable on public.audit_log;
create trigger trg_audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function public.enforce_audit_log_immutability();

-- AUDIT CHAIN VERIFICATION FUNCTION
create or replace function public.verify_audit_chain(p_org_id uuid default null)
returns table (
  is_valid boolean,
  broken_at_sequence bigint,
  total_records_checked bigint,
  error_detail text
) as $$
declare
  r record;
  expected_hash text;
  last_hash text := 'GENESIS_HASH_00000000000000000000000000000000000000000000000000000000';
  counter bigint := 0;
begin
  for r in (
    select sequence_number, canonical_payload, previous_hash, current_hash, created_at
    from public.audit_log
    where (p_org_id is null or organization_id = p_org_id)
    order by sequence_number asc
  ) loop
    counter := counter + 1;

    -- Verify previous hash continuity
    if counter > 1 and r.previous_hash != last_hash then
      return query select false, r.sequence_number, counter, 'Broken hash continuity with previous record';
      return;
    end if;

    -- Recalculate SHA-256 (previous_hash + canonical_payload + created_at)
    expected_hash := encode(digest(r.previous_hash || r.canonical_payload::text || r.created_at::text, 'sha256'), 'hex');
    
    if r.current_hash != expected_hash then
      return query select false, r.sequence_number, counter, 'Hash mismatch on row content recalculation';
      return;
    end if;

    last_hash := r.current_hash;
  end loop;

  return query select true, null::bigint, counter, 'All audit records verified successfully';
end;
$$ language plpgsql security definer;

-- 8. MANUFACTURER REGISTRY
create table if not exists public.manufacturer_registry (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  normalized_name text not null unique,
  license_number text,
  country text not null default 'India',
  is_who_prequalified boolean default false,
  cdsco_approved boolean default true,
  risk_rating text default 'Low' check (risk_rating in ('Low', 'Medium', 'High', 'Critical')),
  registered_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_manufacturer_normalized on public.manufacturer_registry(normalized_name);

-- 9. HUMAN REVIEW QUEUE & REGULATORY SUBMISSION DRAFTS
create table if not exists public.review_queue (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  verification_id uuid references public.verifications(id) on delete set null,
  report_id text not null,
  medicine_name text not null,
  manufacturer text not null,
  batch_number text,
  draft_type text not null check (draft_type in ('quarantine_order', 'cdsco_form_19', 'compliance_escalation', 'batch_recall')),
  draft_title text not null,
  draft_content text not null,
  risk_score integer not null check (risk_score between 0 and 100),
  status public.review_status default 'pending_review' not null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_role text,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_review_queue_status on public.review_queue(status);
create index if not exists idx_review_queue_org on public.review_queue(organization_id);

create table if not exists public.regulatory_submissions (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  review_id uuid references public.review_queue(id) on delete cascade,
  report_id text not null,
  form_type text not null default 'CDSCO_FORM_19',
  filing_status public.submission_status not null default 'draft',
  authority_target text not null default 'CDSCO_INDIA',
  docket_reference_number text,
  submitted_by_user_id uuid references auth.users(id) on delete set null,
  submission_notes text,
  signed_off_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. NOTIFICATION LOG & USER FEEDBACK
create table if not exists public.notification_log (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('email', 'sms', 'webhook', 'in_app')),
  recipient_target text not null,
  event_type text not null,
  status text not null check (status in ('queued', 'sent', 'failed', 'delivered')),
  payload jsonb not null,
  error_message text,
  created_at timestamptz default now()
);

create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade not null,
  verification_id uuid references public.verifications(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  feedback_category text not null check (feedback_category in ('accuracy', 'ui', 'speed', 'compliance', 'other')),
  comments text,
  created_at timestamptz default now()
);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.api_keys enable row level security;
alter table public.rate_limit_usage enable row level security;
alter table public.openfda_cache enable row level security;
alter table public.ai_model_routing_log enable row level security;
alter table public.audit_log enable row level security;
alter table public.manufacturer_registry enable row level security;
alter table public.review_queue enable row level security;
alter table public.regulatory_submissions enable row level security;
alter table public.notification_log enable row level security;
alter table public.feedback enable row level security;

-- Organizations: Members can view their orgs, owners/admins can update
create policy "Org members can view own organization"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "Org admins can update organization"
  on public.organizations for update
  using (public.has_org_role(id, array['owner'::public.org_role, 'admin'::public.org_role]));

-- Organization Members: Members can view team, admins can manage
create policy "Members can view org teammates"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy "Admins can manage org members"
  on public.organization_members for all
  using (public.has_org_role(organization_id, array['owner'::public.org_role, 'admin'::public.org_role]));

-- OpenFDA Cache: Public readable (authenticated/anon), server-side writable
create policy "Anyone can read openfda cache"
  on public.openfda_cache for select
  using (true);

create policy "Authenticated users can insert cache entries"
  on public.openfda_cache for insert
  to authenticated
  with check (true);

-- AI Model Routing Log: Org members can view own org logs
create policy "Org members can view AI routing logs"
  on public.ai_model_routing_log for select
  using (organization_id is null or public.is_org_member(organization_id));

create policy "Authenticated users can insert AI routing logs"
  on public.ai_model_routing_log for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Audit Log: Org members can view audit entries, append-only insertion
create policy "Org members can view audit log"
  on public.audit_log for select
  using (organization_id is null or public.is_org_member(organization_id));

create policy "Authenticated users can append audit log"
  on public.audit_log for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Manufacturer Registry: Read access for all authenticated, admin management
create policy "Authenticated can read manufacturer registry"
  on public.manufacturer_registry for select
  to authenticated
  using (true);

-- Review Queue: Scoped to org members
create policy "Org members can view review queue"
  on public.review_queue for select
  using (organization_id is null or public.is_org_member(organization_id));

create policy "Org members can insert review queue items"
  on public.review_queue for insert
  to authenticated
  with check (organization_id is null or public.is_org_member(organization_id));

create policy "Pharmacists, regulators, and admins can update review queue"
  on public.review_queue for update
  using (
    organization_id is null or
    public.has_org_role(organization_id, array['owner'::public.org_role, 'admin'::public.org_role, 'pharmacist'::public.org_role, 'regulator'::public.org_role])
  );

-- Regulatory Submissions: Restricted to designated roles
create policy "Org members can view regulatory submissions"
  on public.regulatory_submissions for select
  using (organization_id is null or public.is_org_member(organization_id));

create policy "Regulators and admins can manage regulatory submissions"
  on public.regulatory_submissions for all
  using (
    organization_id is null or
    public.has_org_role(organization_id, array['owner'::public.org_role, 'admin'::public.org_role, 'regulator'::public.org_role])
  );

-- Feedback
create policy "Users can view own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

create policy "Users can submit feedback"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ==============================================================================
-- 12. SEED DATA: Known Manufacturers & Pre-qualifications
-- ==============================================================================
insert into public.manufacturer_registry (name, normalized_name, license_number, country, is_who_prequalified, cdsco_approved, risk_rating) values
  ('Cipla Limited', 'cipla', 'DL-CIP-001', 'India', true, true, 'Low'),
  ('Sun Pharmaceutical Industries Ltd', 'sun pharma', 'DL-SUN-002', 'India', true, true, 'Low'),
  ('Dr. Reddy''s Laboratories', 'dr reddy', 'DL-DRL-003', 'India', true, true, 'Low'),
  ('Pfizer Inc.', 'pfizer', 'US-FDA-1001', 'USA', true, true, 'Low'),
  ('Sanofi S.A.', 'sanofi', 'FR-EMA-2001', 'France', true, true, 'Low'),
  ('Aurobindo Pharma', 'aurobindo', 'DL-AUR-004', 'India', true, true, 'Low'),
  ('Zydus Lifesciences', 'zydus', 'DL-ZYD-005', 'India', true, true, 'Low'),
  ('Lupin Limited', 'lupin', 'DL-LUP-006', 'India', true, true, 'Low'),
  ('Torrent Pharmaceuticals', 'torrent', 'DL-TOR-007', 'India', true, true, 'Low'),
  ('GlaxoSmithKline plc', 'gsk', 'UK-MHRA-3001', 'UK', true, true, 'Low')
on conflict (normalized_name) do nothing;
