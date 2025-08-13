-- infra/supabase.sql

-- 1. Create a table for leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 'new' -> 'processing' -> 'ocr_complete' -> 'enriched' -> 'scored' -> 'outreach_ready' -> 'complete'
  status text not null default 'new',

  image_storage_path text not null, -- e.g., 'public/lead-image-123.png'

  -- OCR results
  ocr_text text,

  -- Parsed & Normalized data from OCR
  business_name text,
  phone_number text,
  website text,
  services jsonb, -- array of strings
  calls_to_action jsonb, -- array of strings
  colors jsonb, -- array of hex codes

  -- Enrichment results
  enrichment_data jsonb, -- data from Google Maps, Yelp, etc.

  -- Scoring
  score smallint,
  score_rationale text[],

  -- Offers
  recommended_offers jsonb,

  -- Generated content
  preview_site_url text,
  generated_sms text,
  generated_email jsonb -- { subject: string, body: string }
);

-- 2. Set up Row Level Security (RLS)
-- This is disabled by default. We'll enable it and rely on service_role key for backend access.
alter table leads enable row level security;

-- 3. Create a function to automatically update `updated_at`
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4. Create a trigger to call the function when a row is updated
create trigger on_lead_updated
  before update on leads
  for each row
  execute procedure handle_updated_at();

-- 5. Supabase Storage
-- We need a bucket for storing the images. Let's call it `lead_images`.
-- This must be created in the Supabase Dashboard under Storage.
-- We'll make it a public bucket for simplicity in the MVP.
-- The RLS policies for storage can be set up there too.
-- e.g., allow authenticated users to upload into a folder named after their user_id.

-- 6. Seed data
insert into leads (image_storage_path, status, business_name) values
('seed/sample-truck.jpg', 'new', 'Example Business');
