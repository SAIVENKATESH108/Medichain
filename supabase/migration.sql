-- ============================================
-- MediChain Verify — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  organization text,
  role text default 'Consumer' check (role in ('Consumer', 'Pharmacist', 'Regulator', 'Manufacturer', 'Healthcare Provider')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. VERIFICATIONS
create table if not exists public.verifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  report_id text not null,
  medicine_name text not null,
  batch_number text,
  manufacturer text not null,
  expiry_date date,
  country text,
  image_url text,
  verdict text not null check (verdict in ('VERIFIED', 'SUSPICIOUS', 'COUNTERFEIT')),
  confidence integer not null check (confidence between 0 and 100),
  risk_score integer not null check (risk_score between 0 and 100),
  summary text,
  visual_analysis jsonb,
  supply_chain_check jsonb,
  batch_verification jsonb,
  recommendations text[],
  created_at timestamptz default now()
);

-- 3. CHAT SESSIONS
create table if not exists public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. CHAT MESSAGES
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- 5. USER SETTINGS
create table if not exists public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  email_alerts boolean default true,
  sms_alerts boolean default false,
  weekly_digest boolean default true,
  webhook_url text,
  blockchain_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. ALERTS
create table if not exists public.alerts (
  id uuid default gen_random_uuid() primary key,
  alert_code text not null,
  medicine text not null,
  manufacturer text,
  batch text,
  region text,
  risk_level text not null check (risk_level in ('High', 'Medium', 'Low')),
  description text,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES for performance
-- ============================================
create index if not exists idx_verifications_user_id on public.verifications(user_id);
create index if not exists idx_verifications_created_at on public.verifications(created_at desc);
create index if not exists idx_verifications_verdict on public.verifications(verdict);
create index if not exists idx_chat_sessions_user_id on public.chat_sessions(user_id);
create index if not exists idx_chat_messages_session_id on public.chat_messages(session_id);
create index if not exists idx_alerts_risk_level on public.alerts(risk_level);
create index if not exists idx_alerts_created_at on public.alerts(created_at desc);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table public.profiles enable row level security;
alter table public.verifications enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_settings enable row level security;
alter table public.alerts enable row level security;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Verifications
create policy "Users can view own verifications"
  on public.verifications for select using (auth.uid() = user_id);
create policy "Users can insert own verifications"
  on public.verifications for insert with check (auth.uid() = user_id);
create policy "Users can delete own verifications"
  on public.verifications for delete using (auth.uid() = user_id);

-- Chat Sessions
create policy "Users can view own chat sessions"
  on public.chat_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own chat sessions"
  on public.chat_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own chat sessions"
  on public.chat_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own chat sessions"
  on public.chat_sessions for delete using (auth.uid() = user_id);

-- Chat Messages (access through session ownership)
create policy "Users can view messages in own sessions"
  on public.chat_messages for select using (
    exists (select 1 from public.chat_sessions where id = chat_messages.session_id and user_id = auth.uid())
  );
create policy "Users can insert messages in own sessions"
  on public.chat_messages for insert with check (
    exists (select 1 from public.chat_sessions where id = chat_messages.session_id and user_id = auth.uid())
  );

-- User Settings
create policy "Users can view own settings"
  on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings"
  on public.user_settings for update using (auth.uid() = user_id);

-- Alerts (all authenticated users can view)
create policy "Authenticated users can view alerts"
  on public.alerts for select to authenticated using (true);

-- ============================================
-- TRIGGER: Auto-create profile + settings on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- TRIGGER: Auto-update updated_at timestamps
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.update_updated_at();

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.update_updated_at();

-- ============================================
-- SEED: Initial alerts data
-- ============================================
insert into public.alerts (alert_code, medicine, manufacturer, batch, region, risk_level, description) values
  ('ALT-001', 'Amoxicillin 250mg', 'Unknown Mfg', 'UNK-0099', 'West Africa', 'High', 'Unregistered batch detected in Lagos distribution center'),
  ('ALT-002', 'Insulin Glargine', 'Sanofi (suspected)', 'SNF-2026-5567', 'South America', 'Medium', 'Packaging inconsistency flagged by visual AI'),
  ('ALT-003', 'Ciprofloxacin 500mg', 'Fake Pharma Co', 'FPC-0001', 'West Africa', 'High', 'Confirmed counterfeit — batch not in any registered database'),
  ('ALT-004', 'Clopidogrel 75mg', 'Unregistered Co', 'UC-9999', 'Southeast Asia', 'High', 'Supply chain path missing customs verification node'),
  ('ALT-005', 'Ibuprofen 400mg', 'Suspect Labs', 'SL-2026-0012', 'South America', 'Medium', 'Manufacturer not found in WHO prequalified list'),
  ('ALT-006', 'Doxycycline 100mg', 'Aurobindo', 'AUR-2026-1178', 'East Africa', 'Medium', 'Temperature excursion detected during transit'),
  ('ALT-007', 'Tamiflu 75mg', 'Roche (suspected)', 'ROC-2026-1190', 'Southeast Asia', 'Medium', 'Hologram pattern does not match reference database'),
  ('ALT-008', 'Diazepam 5mg', 'Unknown Source', 'FAKE-0000', 'South Asia', 'High', 'Controlled substance with no valid chain of custody');
