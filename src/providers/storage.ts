/**
 * Field Snap AI - Storage Provider (Supabase Storage)
 * 
 * This module handles file storage operations including image uploads,
 * retrieval, and management using Supabase Storage.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class StorageProvider {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration for storage');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'field-snap-images';
  }

  /**
   * Upload an image file
   */
  async uploadImage(file: File | Buffer, fileName: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    return this.getPublicUrl(data.path);
  }

  /**
   * Get public URL for a stored file
   */
  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Generate a signed upload URL
   */
  async createSignedUploadUrl(fileName: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUploadUrl(fileName, { upsert: true });

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }
}

export const storage = new StorageProvider();
