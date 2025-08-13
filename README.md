# Field Snap AI - MVP

This project is the Minimum Viable Product (MVP) for "Field Snap AI", a service that turns photos of local business ads into qualified outbound leads.

## Goal

The system is designed to automate the following pipeline:
1.  **Ingest:** Receive a photo of a business ad (e.g., a truck wrap, storefront sign).
2.  **OCR & Parse:** Extract key details like business name, phone number, services, etc.
3.  **Enrich:** Find the business's website, social media, and reviews.
4.  **Score & Qualify:** Score the lead based on transparent rules and recommend offers.
5.  **Generate Outreach:** Create a preview website and ready-to-send SMS/email drafts.

## Tech Stack

-   **Runtime:** Bun / Node.js
-   **Language:** TypeScript
-   **Database:** Supabase (Postgres)
-   **Storage:** Supabase Storage
-   **Deployment:** Serverless Functions (e.g., Netlify, Supabase Edge Functions)
-   **Key Libraries:**
    -   `zod` for data validation
    -   `@supabase/supabase-js` for database and storage access

## Project Structure

```
/infra
  supabase.sql                 -- Database schema and seed data
  env.example                  -- Template for environment variables
/functions
  ingest.ts                    -- Main HTTP entry point for the pipeline
/src
  /core
    types.ts                   -- Zod schemas and TypeScript types
    ...
  /providers
    ocr.ts                     -- OCR provider interface and implementations
    db.ts                      -- Supabase database client and queries
    storage.ts                 -- Supabase storage helpers
    ...
```

## Getting Started

### 1. Set up Environment Variables

Copy the `infra/env.example` file to `.env` and fill in the required values for Supabase, OCR providers, etc.

```bash
cp infra/env.example .env
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Set up Database

You can use the `infra/supabase.sql` file to set up your database schema in the Supabase dashboard's SQL Editor.

### 4. Run the Ingest Function

The `ingest` function can be run locally for testing. It starts an HTTP server that listens for POST requests.

```bash
bun run functions/ingest.ts
```

You can then send a request to it:

```bash
curl -X POST http://localhost:3001 \
-H "Content-Type: application/json" \
-d '{
  "imageUrl": "https://example.com/path/to/your/image.jpg"
}'
```

This will kick off the lead generation pipeline.
