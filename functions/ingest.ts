/**
 * @file The main entry point for the Field Snap AI pipeline.
 *
 * This function handles an HTTP POST request containing an image URL,
 * uploads the image to storage, creates a new lead record in the database,
 * and enqueues a job for background processing.
 */

import { IngestInputSchema } from '../src/core/types';
import { createLead } from '../src/providers/db';
// We will create this storage helper in a later step.
// For now, we define the function signature we expect.
import { uploadImageFromUrl } from '../src/providers/storage';

/**
 * The main handler for the ingest function.
 * This is designed to be compatible with serverless runtimes (Netlify, Vercel, etc.)
 * that use the standard Request and Response Web API objects.
 *
 * @param req The incoming HTTP Request object.
 * @returns An HTTP Response object.
 */
export default async function handler(req: Request): Promise<Response> {
  // 1. Ensure the request method is POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 2. Parse and validate the incoming JSON body
  let ingestInput;
  try {
    const body = await req.json();
    ingestInput = IngestInputSchema.parse(body);
  } catch (error) {
    console.error('Invalid request body:', error);
    const message = error instanceof Error ? error.message : 'Invalid JSON format.';
    return new Response(JSON.stringify({ error: 'Invalid request body', details: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log(`[ingest] Received request to process image: ${ingestInput.imageUrl}`);

    // 3. Upload the image to Supabase Storage
    // The `uploadImageFromUrl` function will be responsible for:
    // a) Fetching the image from the public URL.
    // b) Generating a unique filename.
    // c) Uploading the image buffer to our 'lead_images' bucket.
    // d) Returning the storage path of the uploaded file.
    // NOTE: This function is not yet implemented. We are building the structure first.
    const imagePath = await uploadImageFromUrl(ingestInput.imageUrl);
    console.log(`[ingest] Image successfully uploaded to: ${imagePath}`);

    // 4. Create a new lead record in the database with the storage path
    const newLead = await createLead({ image_storage_path: imagePath });
    console.log(`[ingest] New lead created with ID: ${newLead.id}`);

    // 5. Enqueue a job for the next step in the pipeline (e.g., OCR)
    // In a production system, this would add a message to a queue like SQS,
    // RabbitMQ, or a Postgres-based queue (like pg-boss).
    // For this MVP, we can log that the job is "enqueued".
    console.log(`[ingest] Enqueuing processing job for lead ${newLead.id}...`);
    // In a simple setup, the next step could be triggered via an async call:
    // processLead(newLead.id).catch(console.error);

    // 6. Return a success response to the client
    return new Response(JSON.stringify(newLead), {
      status: 201, // 201 Created
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ingest] Pipeline failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Ingestion pipeline failed: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Example of how this handler could be used with Bun's built-in server.
 * To run this file directly: `bun run functions/ingest.ts`
 * You would need to add a script to package.json to handle this.
 */
if (import.meta.main) {
  console.log('Starting ingest server for local testing...');
  const { default: handler } = await import('./ingest');

  Bun.serve({
    fetch: handler,
    port: process.env.PORT || 3001,
  });

  console.log(`Ingest server running on http://localhost:${process.env.PORT || 3001}`);
}
