import { z } from 'zod';

// The single source of truth for a Lead object.
// Corresponds to the `leads` table in `supabase.sql`.
export const LeadSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),

  status: z.enum([
    'new',
    'processing',
    'ocr_complete',
    'enriched',
    'scored',
    'outreach_ready',
    'complete',
  ]),

  image_storage_path: z.string(),

  // Data extracted from the image
  ocr_text: z.string().nullable().optional(),

  // Parsed and normalized data
  business_name: z.string().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  services: z.array(z.string()).nullable().optional(),
  calls_to_action: z.array(z.string()).nullable().optional(),
  colors: z.array(z.string()).nullable().optional(),

  // Data from external enrichment services
  enrichment_data: z.record(z.any()).nullable().optional(),

  // Our analysis
  score: z.number().int().min(0).max(100).nullable().optional(),
  score_rationale: z.array(z.string()).nullable().optional(),
  recommended_offers: z.array(z.record(z.any())).nullable().optional(),

  // Generated content for outreach
  preview_site_url: z.string().url().nullable().optional(),
  generated_sms: z.string().nullable().optional(),
  generated_email: z.object({
    subject: z.string(),
    body: z.string(),
  }).nullable().optional(),
});

// Inferred TypeScript type
export type Lead = z.infer<typeof LeadSchema>;

// Schema for the initial input to the ingest function
export const IngestInputSchema = z.object({
  imageUrl: z.string().url(),
  // In the future, we might support direct file uploads
  // file: z.instanceof(Buffer).optional(),
});

export type IngestInput = z.infer<typeof IngestInputSchema>;
