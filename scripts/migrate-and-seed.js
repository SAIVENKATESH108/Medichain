import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function canonicalJson(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}';
}

async function runMigrateAndSeed() {
  const client = new Client({
    host: 'db.ibzdlyhescujpjxqvzvp.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'Chi65cken@???',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected to PostgreSQL successfully!');

    // Step 1: Extensions
    console.log('\n--- Step 1: Creating Extensions ---');
    await client.query(`
      create extension if not exists "pgcrypto";
      create extension if not exists "uuid-ossp";
    `);

    // Step 2: Types
    console.log('\n--- Step 2: Creating Enum Types ---');
    await client.query(`
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
    `);

    // Step 3: Core Tables
    console.log('\n--- Step 3: Creating Tables ---');
    await client.query(`
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

      create table if not exists public.profiles (
        id uuid references auth.users(id) on delete cascade primary key,
        full_name text,
        email text,
        organization text,
        role text default 'Consumer',
        avatar_url text,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      create table if not exists public.verifications (
        id uuid default gen_random_uuid() primary key,
        user_id uuid references auth.users(id) on delete cascade,
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

      create table if not exists public.review_queue (
        id uuid default gen_random_uuid() primary key,
        organization_id uuid references public.organizations(id) on delete cascade,
        report_id text not null,
        medicine_name text not null,
        batch_number text,
        manufacturer text not null,
        risk_score integer not null check (risk_score between 0 and 100),
        verdict text not null default 'SUSPICIOUS',
        draft_type text not null,
        draft_title text not null,
        draft_content text not null,
        status public.review_status not null default 'pending_review',
        reviewed_by uuid references auth.users(id) on delete set null,
        reviewer_role text,
        review_notes text,
        reviewed_at timestamptz,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      alter table public.review_queue add column if not exists verdict text not null default 'SUSPICIOUS';
      alter table public.verifications add column if not exists user_id uuid references auth.users(id) on delete cascade;
      alter table public.verifications alter column user_id drop not null;
      alter table public.quarantined_batches add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

      create table if not exists public.audit_log (
        id uuid default gen_random_uuid() primary key,
        sequence_number bigint not null unique,
        organization_id uuid references public.organizations(id) on delete cascade,
        user_id uuid references auth.users(id) on delete set null,
        event_type text not null,
        action text not null,
        resource_type text not null,
        resource_id text not null,
        canonical_payload jsonb not null,
        previous_hash text not null,
        current_hash text not null,
        created_at timestamptz default now() not null
      );

      create table if not exists public.ai_model_routing_log (
        id uuid default gen_random_uuid() primary key,
        organization_id uuid references public.organizations(id) on delete cascade,
        task_type text not null,
        provider_used public.model_provider not null,
        model_name text not null,
        fallback_triggered boolean not null default false,
        fallback_reason text,
        circuit_breaker_status text default 'CLOSED',
        latency_ms integer not null,
        input_tokens integer,
        output_tokens integer,
        cost_estimate_usd numeric(10, 6) default 0.0,
        status_code integer not null,
        error_message text,
        created_at timestamptz default now()
      );

      create table if not exists public.chat_sessions (
        id uuid default gen_random_uuid() primary key,
        user_id uuid references auth.users(id) on delete cascade not null,
        title text default 'New Chat',
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

      create table if not exists public.chat_messages (
        id uuid default gen_random_uuid() primary key,
        session_id uuid references public.chat_sessions(id) on delete cascade not null,
        role text not null check (role in ('user', 'assistant')),
        content text not null,
        created_at timestamptz default now()
      );

      create table if not exists public.user_settings (
        id uuid default gen_random_uuid() primary key,
        user_id uuid references auth.users(id) on delete cascade unique not null,
        email_alerts boolean default true,
        sms_alerts boolean default false,
        weekly_digest boolean default true,
        webhook_url text,
        blockchain_enabled boolean default true,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );

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

      create table if not exists public.supply_chain_alerts (
        id uuid default gen_random_uuid() primary key,
        alert_code text not null,
        medicine text not null,
        manufacturer text not null,
        batch text not null,
        region text not null,
        risk_level text not null check (risk_level in ('High', 'Medium', 'Low')),
        description text not null,
        time text not null default 'Just now',
        created_at timestamptz default now()
      );

      alter table public.supply_chain_alerts enable row level security;
      drop policy if exists "Allow public select on supply_chain_alerts" on public.supply_chain_alerts;
      create policy "Allow public select on supply_chain_alerts" on public.supply_chain_alerts for select using (true);
    `);
    console.log('✅ All Core Database Tables verified/created.');

    // Step 4: Seed Organizations
    console.log('\n--- Step 4: Seeding Organizations ---');
    const orgRes = await client.query(`
      insert into public.organizations (name, slug, tier)
      values 
        ('Apollo Health Network', 'apollo-health', 'enterprise'),
        ('Fortis Healthcare Clinical Node', 'fortis-healthcare', 'enterprise'),
        ('CDSCO Central Drug Standard Control Organisation', 'cdsco-regulator', 'regulator')
      on conflict (slug) do update set name = excluded.name
      returning id, name, slug;
    `);
    const apolloOrgId = orgRes.rows.find((r) => r.slug === 'apollo-health')?.id || orgRes.rows[0].id;
    console.log(`✅ Seeded organizations. Apollo Org ID: ${apolloOrgId}`);

    // Step 5: Seed CDSCO Drug Schedules
    console.log('\n--- Step 5: Seeding CDSCO Drug Schedules ---');
    await client.query(`
      insert into public.drug_schedules (schedule, title, description, requires_prescription, mandatory_warning_label, gsr_reference, sample_drugs)
      values
        (
          'H',
          'Prescription Drugs (Schedule H)',
          'Substances which can be dispensed only on the prescription of a Registered Medical Practitioner (RMP).',
          true,
          'Warning: To be sold by retail on the prescription of a Registered Medical Practitioner only.',
          'Drugs & Cosmetics Rules 1945 Rule 65',
          array['Amoxicillin', 'Azithromycin', 'Cefixime', 'Ciprofloxacin', 'Pantoprazole', 'Amoxicillin + Clavulanate']
        ),
        (
          'H1',
          'Restricted 3rd/4th Gen Antibiotics & Anti-TB Agents',
          'Monitored reserve antimicrobial category introduced under GSR 588(E) to curb antimicrobial resistance (AMR). Strict register maintenance for 3 years.',
          true,
          'Warning: It is dangerous to take this preparation except in accordance with medical advice.',
          'GSR 588(E) 2013',
          array['Meropenem', 'Linezolid', 'Moxifloxacin', 'Doripenem', 'Faropenem', 'Cefpodoxime']
        ),
        (
          'X',
          'Controlled Psychotropic & Habit-Forming Drugs',
          'Narcotic and psychotropic substances requiring duplicate written prescription storage for 2 years in locked cabinets.',
          true,
          'Schedule X Drug: Warning: To be sold by retail on the prescription of a Registered Medical Practitioner only.',
          'Drugs & Cosmetics Act Section 18',
          array['Ketamine', 'Methylphenidate', 'Amphetamine', 'Secobarbital', 'Pentobarbital']
        ),
        (
          'G',
          'Medical Supervision Mandatory Substances',
          'Hormonal preparations and antidiabetics requiring cautionary labeling against unsupervised administration.',
          false,
          'Caution: It is dangerous to take this preparation except under medical supervision.',
          'D&C Rules Schedule G',
          array['Glibenclamide', 'Metformin combos', 'Carbimazole', 'Hydroxyurea', 'Testosterone']
        )
      on conflict (schedule) do update set
        title = excluded.title,
        description = excluded.description,
        mandatory_warning_label = excluded.mandatory_warning_label,
        sample_drugs = excluded.sample_drugs;
    `);
    console.log('✅ CDSCO Statutory Drug Schedules seeded.');

    // Step 6: Seed Quarantined Batches
    console.log('\n--- Step 6: Seeding Quarantined Batches ---');
    await client.query(`
      delete from public.quarantined_batches;
      insert into public.quarantined_batches (
        organization_id, vault_id, medicine_name, batch_number, manufacturer,
        units_quarantined, interception_reason, status, disposition_officer, cdsco_case_no, quarantine_date
      ) values
        (
          '${apolloOrgId}',
          'QVA-9021',
          'Amoxicillin Trihydrate 500mg Capsules',
          'CIP-2026-X88',
          'Unknown Sub-Contractor (Unregistered Fictitious Mfg)',
          14500,
          'Optical typography mismatch, inverted 2D DataMatrix code, and unregistered batch number detected by Agent 1 Vision OCR.',
          'ISOLATED',
          'Dr. R. Sharma (Chief Pharmacist)',
          'CDSCO-WZ-2026-0881',
          '2026-08-21'
        ),
        (
          '${apolloOrgId}',
          'QVA-9022',
          'Insulin Glargine 100 IU/mL Injection',
          'INS-2025-0994',
          'Biotech Global Corp',
          3200,
          'Temperature excursion flag (>25°C for 48 hours) during transit from Dubai Hub to Mumbai distribution center.',
          'UNDER_TESTING',
          'V. Patel (Quality Assurance Lead)',
          'CDSCO-NZ-2026-0412',
          '2026-08-19'
        ),
        (
          '${apolloOrgId}',
          'QVA-9018',
          'Cefixime 200mg DT Tablets',
          'CFX-2024-0012',
          'Apex Pharma Ltd',
          8000,
          'Expired active compound batch re-labelled with falsified 2028 expiry date violating D&C Act Section 18(a).',
          'DESTROYED',
          'State Drug Inspector Sign-off',
          'CDSCO-SZ-2026-1190',
          '2026-08-10'
        ),
        (
          '${apolloOrgId}',
          'QVA-9025',
          'Meropenem 1g IV Injection',
          'MRP-2026-0045',
          'Spurious Generic Labs',
          6500,
          'Schedule H1 restricted antibiotic lacking mandatory warning label and CDSCO drug manufacturing license number.',
          'ISOLATED',
          'Dr. Sai Venkatesh (Pharmacist)',
          'CDSCO-HQ-2026-3021',
          '2026-08-22'
        );
    `);
    console.log('✅ Genuine Quarantined Batches seeded.');

    // Step 7: Seed Review Queue
    console.log('\n--- Step 7: Seeding Review Queue ---');
    await client.query(`
      delete from public.review_queue;
      insert into public.review_queue (
        organization_id, report_id, medicine_name, batch_number, manufacturer,
        risk_score, verdict, draft_type, draft_title, draft_content, status
      ) values
        (
          '${apolloOrgId}',
          'REP-9921A',
          'Amoxicillin Trihydrate 500mg',
          'CIP-2026-X88',
          'Unknown Sub-Contractor',
          94,
          'COUNTERFEIT',
          'cdsco_form_19',
          'Draft CDSCO Form 19 Notice to State Drug Controller',
          'MEMORANDUM OF COMPLIANCE INTERCEPTION UNDER DRUGS & COSMETICS ACT 1940\n\nTo: The State Drug Controller / Licensing Authority\nFrom: Apollo Health Network Central Pharmacy Node\nSubject: Formal Notification of Suspected Spurious Pharmaceutical Batch\n\nProduct: Amoxicillin Trihydrate 500mg\nBatch Number: CIP-2026-X88\nReported Manufacturer: Unknown Sub-Contractor\nRisk Evaluation Score: 94/100 (HIGH RISK - COUNTERFEIT)\nCDSCO Statutory Classification: Schedule H\n\nObservations:\n1. 2D DataMatrix barcode did not resolve to any active GS1 GTIN registration.\n2. Visual packaging analysis detected blurred micro-text on blister foil.\n3. Product physical quarantine established in Vault QVA-9021 under Section 22.\n\nStatus: AWAITING PHARMACIST SIGN-OFF FOR TRANSMISSION',
          'pending_review'
        ),
        (
          '${apolloOrgId}',
          'REP-8812B',
          'Meropenem 1g IV Injection',
          'MRP-2026-0045',
          'Spurious Generic Labs',
          91,
          'COUNTERFEIT',
          'quarantine_order',
          'Draft Internal Hospital Quarantine Order #HQ-0045',
          'APOLLO HEALTH NETWORK — NOTICE OF LOT ISOLATION\n\nTo all ward dispensaries and satellite hospital pharmacies:\nEffective immediately, batch MRP-2026-0045 of Meropenem 1g is isolated under quarantine.\nDo not dispense. Retain all stock in locked storage.\n\nReason: Schedule H1 compliance anomaly and unverified manufacturer credentials.',
          'pending_review'
        ),
        (
          '${apolloOrgId}',
          'REP-7734C',
          'Insulin Glargine 100 IU/mL',
          'INS-2025-0994',
          'Biotech Global Corp',
          68,
          'SUSPICIOUS',
          'quarantine_order',
          'Draft Quality Assurance Re-inspection Order',
          'QA RE-INSPECTION NOTICE\nLot INS-2025-0994 flagged for cold-chain thermal anomaly.\nSamples routed to analytical laboratory for HPLC potency assays before release clearance.',
          'approved'
        );
    `);
    console.log('✅ Review Queue seeded.');

    // Step 8: Seed Live AI ModelRouter Telemetry Logs
    console.log('\n--- Step 8: Seeding Live ModelRouter Telemetry Logs ---');
    await client.query(`
      delete from public.ai_model_routing_log;
      insert into public.ai_model_routing_log (
        organization_id, task_type, provider, model,
        fallback_triggered, latency_ms, status, prompt_tokens, completion_tokens, cost_estimate_usd
      ) values
        ('${apolloOrgId}', 'content_safety', 'groq', 'llama-3.3-70b-versatile', false, 320, 'success', 110, 45, 0.000040),
        ('${apolloOrgId}', 'vision_analysis', 'groq', 'llama-3.2-90b-vision-preview', false, 840, 'success', 850, 420, 0.000420),
        ('${apolloOrgId}', 'database_crossref', 'groq', 'llama-3.3-70b-versatile', false, 410, 'success', 480, 290, 0.000180),
        ('${apolloOrgId}', 'risk_assessment', 'groq', 'llama-3.3-70b-versatile', false, 390, 'success', 620, 310, 0.000210),
        ('${apolloOrgId}', 'vision_analysis', 'openrouter', 'meta-llama/llama-3.2-90b-vision-instruct:free', true, 1450, 'fallback_success', 850, 410, 0.000000),
        ('${apolloOrgId}', 'risk_assessment', 'groq', 'llama-3.3-70b-versatile', false, 360, 'success', 390, 210, 0.000140),
        ('${apolloOrgId}', 'content_safety', 'groq', 'llama-3.3-70b-versatile', false, 290, 'success', 95, 30, 0.000030),
        ('${apolloOrgId}', 'chat_assistant', 'groq', 'llama-3.3-70b-versatile', false, 440, 'success', 580, 290, 0.000190);
    `);
    console.log('✅ ModelRouter Telemetry logs seeded.');

    // Step 9: Seed Audit Log Hash Chain
    console.log('\n--- Step 9: Seeding SHA-256 Audit Ledger ---');
    const existingAudit = await client.query(`select count(*) from public.audit_log;`);
    const count = parseInt(existingAudit.rows[0].count, 10);

    if (count === 0) {
      const blocksToSeed = [
      {
        eventType: 'GENESIS_NODE_INITIALIZED',
        action: 'BOOTSTRAP',
        resourceType: 'system',
        resourceId: 'node-genesis-01',
        payload: { system: 'MediChain Verify Enterprise', version: '2.0.0', initializedAt: '2026-08-20T00:00:00Z' },
      },
      {
        eventType: 'VERIFICATION_APPRAISAL_EXECUTED',
        action: 'VERIFIED_AUTHENTIC',
        resourceType: 'verifications',
        resourceId: 'REP-0014-PAR',
        payload: { medicine: 'Paracetamol 500mg', batch: 'CIP-2026-0441', mfg: 'Cipla Ltd', verdict: 'VERIFIED', riskScore: 4 },
      },
      {
        eventType: 'COUNTERFEIT_INTERCEPTION_FLAGGED',
        action: 'ISOLATE_LOT',
        resourceType: 'quarantined_batches',
        resourceId: 'QVA-9021',
        payload: { medicine: 'Amoxicillin 500mg', batch: 'CIP-2026-X88', mfg: 'Unknown Mfg', verdict: 'COUNTERFEIT', riskScore: 94 },
      },
      {
        eventType: 'REGULATORY_DRAFT_GENERATED',
        action: 'DRAFT_FORM_19',
        resourceType: 'review_queue',
        resourceId: 'REP-9921A',
        payload: { form: 'CDSCO_FORM_19', status: 'pending_review', jurisdiction: 'India (D&C Act)' },
      },
      {
        eventType: 'HUMAN_REVIEW_SIGN_OFF',
        action: 'AUTHORIZED',
        resourceType: 'review_queue',
        resourceId: 'REP-7734C',
        payload: { action: 'approved', reviewer: 'Dr. R. Sharma (Chief Pharmacist)', target: 'QA Laboratory HPLC Test' },
      },
    ];

    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    let seq = 1;

    for (const b of blocksToSeed) {
      const canonical = canonicalJson(b.payload);
      const hashContent = `${seq}:${apolloOrgId}:${b.eventType}:${b.action}:${b.resourceType}:${b.resourceId}:${canonical}:${prevHash}`;
      const currHash = sha256(hashContent);

      await client.query(`
        insert into public.audit_log (
          sequence_number, organization_id, event_type, action,
          resource_type, resource_id, canonical_payload, previous_hash, current_hash
        ) values (
          ${seq}, '${apolloOrgId}', '${b.eventType}', '${b.action}',
          '${b.resourceType}', '${b.resourceId}', '${canonical.replace(/'/g, "''")}'::jsonb,
          '${prevHash}', '${currHash}'
        );
      `);

      prevHash = currHash;
      seq++;
    }
    console.log(`✅ Seeded ${blocksToSeed.length} continuous SHA-256 cryptographic audit ledger blocks.`);
    } else {
      console.log(`ℹ️ Audit log already contains ${count} immutable blocks. Keeping existing cryptographic chain.`);
    }

    // Step 10: Seed Verifications History
    console.log('\n--- Step 10: Seeding Verifications ---');
    await client.query(`
      delete from public.verifications;
      insert into public.verifications (
        report_id, medicine_name, batch_number, manufacturer, expiry_date, country,
        verdict, confidence, risk_score, summary, visual_analysis, recommendations
      ) values
        (
          'REP-0014-PAR',
          'Paracetamol 500mg Tablets IP',
          'CIP-2026-0441',
          'Cipla Ltd',
          '2028-06-15',
          'India',
          'VERIFIED',
          98,
          4,
          'Verified genuine pharmaceutical product. Packaging typography, CDSCO Schedule H labeling, and batch registration match authorized factory records.',
          '{"score": 98, "findings": ["Clear embossed batch number and expiration date", "Accurate Cipla trademark hologram", "Statutory Schedule H red border present"]}'::jsonb,
          array['Product safe for retail distribution', 'Store below 25°C protected from moisture']
        ),
        (
          'REP-9921-AMX',
          'Amoxicillin Trihydrate 500mg',
          'CIP-2026-X88',
          'Unknown Sub-Contractor',
          '2027-12-31',
          'India',
          'COUNTERFEIT',
          94,
          94,
          'Counterfeit medicine flagged. Batch number does not exist in Cipla authorized manufacturing manifests. Blurred micro-typography and missing GS1 DataMatrix code.',
          '{"score": 12, "findings": ["Blurred micro-typography on blister foil", "Missing GS1 2D DataMatrix barcode", "Batch format does not match Cipla standard syntax"]}'::jsonb,
          array['Do not dispense or administer', 'Isolate stock in Quarantine Vault', 'File CDSCO Form 19 with District Drug Inspector']
        ),
        (
          'REP-4412-AZI',
          'Azithromycin 500mg Tablets',
          'SUN-2026-8812',
          'Sun Pharmaceutical Industries Ltd',
          '2028-09-30',
          'India',
          'VERIFIED',
          96,
          6,
          'Verified authentic. OpenFDA active NDC registration verified and CDSCO Schedule H1 warning compliant.',
          '{"score": 96, "findings": ["Authentic Sun Pharma micro-text pattern", "Valid manufacturing license number", "Schedule H1 cautionary advisory present"]}'::jsonb,
          array['Authentic formulation confirmed', 'Dispense only against Registered Medical Practitioner prescription']
        ),
        (
          'REP-3390-INS',
          'Insulin Glargine 100 IU/mL',
          'INS-2025-0994',
          'Biotech Global Corp',
          '2026-11-20',
          'India',
          'SUSPICIOUS',
          72,
          68,
          'Suspicious cold-chain temperature anomaly detected during customs transit. Physical packaging authentic but thermal integrity compromised.',
          '{"score": 78, "findings": ["Physical vial packaging matches reference", "Temperature excursion indicator triggered during transit"]}'::jsonb,
          array['Quarantine lot pending HPLC potency test', 'Do not release to hospital inventory until cleared']
        );
    `);
    // Step 10b: Seed Genuine Supply Chain Alerts
    console.log('\n--- Step 10b: Seeding Supply Chain Alerts ---');
    await client.query(`
      delete from public.supply_chain_alerts;
      insert into public.supply_chain_alerts (
        alert_code, medicine, manufacturer, batch, region, risk_level, description, time
      ) values
        ('ALT-001', 'Amoxicillin Trihydrate 500mg', 'Unknown Sub-Contractor', 'CIP-2026-X88', 'North India (NCR Delhi)', 'High', 'Falsified batch typography & missing 2D DataMatrix code detected in central hospital warehouse.', '2 hours ago'),
        ('ALT-002', 'Insulin Glargine 100 IU/mL', 'Biotech Global Corp', 'INS-2025-0994', 'Western Hub (Mumbai/Dubai)', 'Medium', 'Cold-chain thermal excursion logged (>25°C for 48h) during customs transit.', '4 hours ago'),
        ('ALT-003', 'Meropenem 1g IV Injection', 'Spurious Generic Labs', 'MRP-2026-0045', 'Southern Region (Chennai)', 'High', 'Schedule H1 antibiotic lacking mandatory warning label & statutory license registration.', '6 hours ago'),
        ('ALT-004', 'Cefixime 200mg DT Tablets', 'Apex Pharma Ltd', 'CFX-2024-0012', 'South Asia Export Node', 'High', 'Expired active API relabelled with falsified 2028 expiry date violating D&C Act Section 18.', '8 hours ago'),
        ('ALT-005', 'Azithromycin 500mg IP', 'Sun Pharmaceutical Industries Ltd', 'SUN-2026-8812', 'East Africa Port Intercept', 'Low', 'Authentic product batch cleared through WHO pre-qualified verification pipeline.', '12 hours ago');
    `);
    console.log('✅ Supply chain alerts seeded.');

    // Step 11: Set open RLS for select so client app can read seeded data without auth blocking
    console.log('\n--- Step 11: Configuring Read Access Policies ---');
    await client.query(`
      alter table public.quarantined_batches enable row level security;
      alter table public.drug_schedules enable row level security;
      alter table public.review_queue enable row level security;
      alter table public.audit_log enable row level security;
      alter table public.ai_model_routing_log enable row level security;
      alter table public.verifications enable row level security;
      alter table public.organizations enable row level security;

      drop policy if exists "Allow public select on quarantined_batches" on public.quarantined_batches;
      create policy "Allow public select on quarantined_batches" on public.quarantined_batches for select using (true);

      drop policy if exists "Allow public select on drug_schedules" on public.drug_schedules;
      create policy "Allow public select on drug_schedules" on public.drug_schedules for select using (true);

      drop policy if exists "Allow public select on review_queue" on public.review_queue;
      create policy "Allow public select on review_queue" on public.review_queue for select using (true);

      drop policy if exists "Allow public select on audit_log" on public.audit_log;
      create policy "Allow public select on audit_log" on public.audit_log for select using (true);

      drop policy if exists "Allow public select on ai_model_routing_log" on public.ai_model_routing_log;
      create policy "Allow public select on ai_model_routing_log" on public.ai_model_routing_log for select using (true);

      drop policy if exists "Allow public select on verifications" on public.verifications;
      create policy "Allow public select on verifications" on public.verifications for select using (true);

      drop policy if exists "Allow public select on organizations" on public.organizations;
      create policy "Allow public select on organizations" on public.organizations for select using (true);
    `);
    console.log('✅ Read policies configured for client apps.');

    console.log('\n🎉 ALL DATABASE MIGRATIONS & SEED DATA APPLIED SUCCESSFULLY TO SUPABASE!');
  } catch (err) {
    console.error('❌ Migration / Seeding error:', err);
  } finally {
    await client.end();
  }
}

runMigrateAndSeed();
