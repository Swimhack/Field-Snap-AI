/**
 * @file Manages all database interactions with Supabase.
 *
 * This module initializes the Supabase client and exports a set of
 * functions for performing CRUD operations on the `leads` table.
 * All data returned from the database is validated against Zod schemas.
 */

import { createClient } from '@supabase/supabase-js';
import { Lead, LeadSchema } from '../core/types';

// 1. Initialize Supabase Client
// -----------------------------------------------------------------------------

// We use `process.env` here, which is fine for a server-side context.
// In a browser context, these would need to be prefixed (e.g., `PUBLIC_SUPABASE_URL`).
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are required.'
  );
}

/**
 * The Supabase client instance.
 * Initialized with the service_role key to bypass RLS for backend operations.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2. Database Query Functions
// -----------------------------------------------------------------------------

/**
 * Creates a new lead record in the database.
 *
 * @param leadData The initial data for the lead, typically just the image path.
 * @returns The newly created lead object, validated against the LeadSchema.
 */
export async function createLead(
  leadData: Pick<Lead, 'image_storage_path'>
): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert(leadData)
    .select()
    .single(); // .single() ensures we get an object, not an array

  if (error) {
    console.error('Error creating lead:', error);
    throw new Error('Could not create lead in database.');
  }

  // Validate the data from the DB against our Zod schema.
  // This is a crucial step for type safety.
  return LeadSchema.parse(data);
}

/**
 * Retrieves a lead by its UUID.
 *
 * @param id The UUID of the lead to retrieve.
 * @returns The lead object if found, otherwise null.
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // .single() throws an error if no row is found (code PGRST116)
    // or if multiple rows are found. We can safely ignore the "not found"
    // error and just return null.
    if (error.code !== 'PGRST116') {
      console.error(`Error fetching lead ${id}:`, error);
    }
    return null;
  }

  return LeadSchema.parse(data);
}

/**
 * Updates a lead's data in the database.
 *
 * @param id The UUID of the lead to update.
 * @param updates An object containing the fields to update.
 * @returns The updated lead object.
 */
export async function updateLead(
  id: string,
  updates: Partial<Omit<Lead, 'id' | 'created_at'>>
): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating lead ${id}:`, error);
    throw new Error(`Could not update lead ${id}.`);
  }

  return LeadSchema.parse(data);
}
