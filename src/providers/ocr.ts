/**
 * Field Snap AI - OCR Provider with Factory Pattern
 * 
 * This module provides an abstracted OCR interface with implementations for
 * Google Cloud Vision API and OpenAI Vision API. The factory pattern allows
 * easy swapping between providers based on configuration.
 */

import type { OCRResult } from '@/core/types';

// =============================================================================
// OCR PROVIDER INTERFACE
// =============================================================================

export interface OCRProvider {
  name: string;
  extractText(imageUrl: string): Promise<OCRResult>;
  isConfigured(): boolean;
  getCapabilities(): {
    supportsMultipleLanguages: boolean;
    supportsBoundingBoxes: boolean;
    maxFileSize: number; // in MB
    supportedFormats: string[];
  };
}

// =============================================================================
// GOOGLE CLOUD VISION PROVIDER
// =============================================================================

class GoogleVisionProvider implements OCRProvider {
  name = 'Google Cloud Vision';

  constructor() {
    // Validate configuration
    if (!this.isConfigured()) {
      console.warn('Google Cloud Vision is not properly configured');
    }
  }

  isConfigured(): boolean {
    return !!(
      process.env.GOOGLE_CLOUD_PROJECT_ID &&
      process.env.GOOGLE_CLOUD_PRIVATE_KEY &&
      process.env.GOOGLE_CLOUD_CLIENT_EMAIL
    );
  }

  getCapabilities() {
    return {
      supportsMultipleLanguages: true,
      supportsBoundingBoxes: true,
      maxFileSize: 20, // 20MB
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'BMP', 'WEBP', 'RAW', 'ICO', 'PDF', 'TIFF'],
    };
  }

  async extractText(imageUrl: string): Promise<OCRResult> {
    if (!this.isConfigured()) {
      throw new Error('Google Cloud Vision is not configured');
    }

    const startTime = Date.now();
    
    try {
      // Import Google Cloud Vision (dynamic import to avoid loading if not configured)
      const { ImageAnnotatorClient } = await import('@google-cloud/vision');
      
      // Create credentials object
      const credentials = {
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
        auth_uri: process.env.GOOGLE_CLOUD_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        token_uri: process.env.GOOGLE_CLOUD_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      };

      // Initialize the client
      const client = new ImageAnnotatorClient({
        credentials,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });

      // Perform text detection
      const [result] = await client.textDetection({
        image: { source: { imageUri: imageUrl } },
        imageContext: {
          languageHints: ['en', 'es'], // English and Spanish support
        },
      });

      const detections = result.textAnnotations || [];
      
      if (detections.length === 0) {
        return {
          text: '',
          confidence: 0,
          processingTime: Date.now() - startTime,
        };
      }

      // First annotation contains the full text
      const fullText = detections[0];
      
      // Extract bounding boxes for individual words/phrases
      const boundingBoxes = detections.slice(1).map((detection, index) => {
        const vertices = detection.boundingPoly?.vertices || [];
        if (vertices.length < 4) {
          return null;
        }

        const x = Math.min(...vertices.map(v => v.x || 0));
        const y = Math.min(...vertices.map(v => v.y || 0));
        const width = Math.max(...vertices.map(v => v.x || 0)) - x;
        const height = Math.max(...vertices.map(v => v.y || 0)) - y;

        return {
          text: detection.description || '',
          x,
          y,
          width,
          height,
          confidence: detection.confidence || 0.8, // Google doesn't always provide confidence
        };
      }).filter(Boolean) as NonNullable<OCRResult['boundingBoxes']>[0][];

      // Detect language
      const detectedLanguage = result.fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode || 'en';

      return {
        text: fullText.description || '',
        confidence: fullText.confidence || 0.8,
        boundingBoxes,
        detectedLanguage,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      throw new Error(`Google Vision OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// =============================================================================
// OPENAI VISION PROVIDER
// =============================================================================

class OpenAIVisionProvider implements OCRProvider {
  name = 'OpenAI Vision';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    
    if (!this.isConfigured()) {
      console.warn('OpenAI Vision is not properly configured');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getCapabilities() {
    return {
      supportsMultipleLanguages: true,
      supportsBoundingBoxes: false, // OpenAI doesn't provide bounding boxes
      maxFileSize: 20, // 20MB
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'WEBP'],
    };
  }

  async extractText(imageUrl: string): Promise<OCRResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI Vision is not configured');
    }

    const startTime = Date.now();

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract all text from this image. Focus on business information like:
                  - Business name
                  - Phone numbers
                  - Email addresses
                  - Website URLs
                  - Services offered
                  - Address/location
                  
                  Return the extracted text exactly as it appears, maintaining the original formatting and structure. If no text is found, return an empty string.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.1, // Low temperature for consistent OCR results
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const extractedText = data.choices?.[0]?.message?.content || '';

      // Calculate confidence based on response quality
      // OpenAI doesn't provide confidence scores, so we estimate based on content
      let confidence = 0.7; // Base confidence
      
      if (extractedText.length > 10) confidence += 0.1;
      if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(extractedText)) confidence += 0.1; // Phone number
      if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(extractedText)) confidence += 0.1; // Email
      
      confidence = Math.min(confidence, 1.0);

      return {
        text: extractedText,
        confidence,
        detectedLanguage: 'en', // OpenAI doesn't provide language detection
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      throw new Error(`OpenAI Vision OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// =============================================================================
// TESSERACT OCR PROVIDER (OFFLINE/LOCAL PROCESSING)
// =============================================================================

class TesseractOCRProvider implements OCRProvider {
  name = 'Tesseract OCR';

  isConfigured(): boolean {
    // Tesseract is always available as it runs locally
    return true;
  }

  getCapabilities() {
    return {
      supportsMultipleLanguages: true,
      supportsBoundingBoxes: true,
      maxFileSize: 50, // Reasonable limit for client-side processing
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'WEBP', 'BMP'],
    };
  }

  async extractText(imageUrl: string): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Dynamic import for server-side usage
      const { createWorker } = await import('tesseract.js');

      console.log('Initializing Tesseract OCR worker...');
      const worker = await createWorker('eng');

      console.log('Processing image with Tesseract...');
      const { data } = await worker.recognize(imageUrl);

      await worker.terminate();

      // Convert Tesseract format to our OCRResult format
      const boundingBoxes = data.words?.map(word => ({
        text: word.text,
        x: word.bbox.x0,
        y: word.bbox.y0,
        width: word.bbox.x1 - word.bbox.x0,
        height: word.bbox.y1 - word.bbox.y0,
        confidence: word.confidence / 100, // Convert 0-100 to 0-1
      })) || [];

      return {
        text: data.text.trim(),
        confidence: data.confidence / 100, // Convert 0-100 to 0-1
        boundingBoxes,
        detectedLanguage: 'en',
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error('Tesseract OCR failed:', error);
      throw new Error(`Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// =============================================================================
// OCR FACTORY
// =============================================================================

export type OCRProviderType = 'google_vision' | 'openai_vision' | 'tesseract';

export class OCRFactory {
  private static providers: Map<OCRProviderType, OCRProvider> = new Map();

  static getProvider(type?: OCRProviderType): OCRProvider {
    // If no type specified, use configuration
    if (!type) {
      type = (process.env.OCR_PROVIDER as OCRProviderType) || 'google_vision';
    }

    // Check if provider is already instantiated
    if (this.providers.has(type)) {
      return this.providers.get(type)!;
    }

    // Create new provider instance
    let provider: OCRProvider;

    switch (type) {
      case 'google_vision':
        provider = new GoogleVisionProvider();
        break;
      case 'openai_vision':
        provider = new OpenAIVisionProvider();
        break;
      case 'tesseract':
        provider = new TesseractOCRProvider();
        break;
      default:
        throw new Error(`Unknown OCR provider: ${type}`);
    }

    // Cache the provider
    this.providers.set(type, provider);
    return provider;
  }

  static async getConfiguredProvider(): Promise<OCRProvider> {
    const primaryProvider = process.env.OCR_PRIMARY_PROVIDER as OCRProviderType || 'openai_vision';
    const fallbackProvider = process.env.OCR_FALLBACK_PROVIDER as OCRProviderType || 'google_vision';
    const finalFallback = process.env.OCR_FINAL_FALLBACK as OCRProviderType || 'tesseract';

    // Try primary provider first (OpenAI Vision)
    try {
      const primary = this.getProvider(primaryProvider);
      if (primary.isConfigured()) {
        return primary;
      }
    } catch (error) {
      console.warn(`Primary OCR provider (${primaryProvider}) failed:`, error);
    }

    // Try fallback provider (Google Vision)
    try {
      const fallback = this.getProvider(fallbackProvider);
      if (fallback.isConfigured()) {
        console.warn(`Using fallback OCR provider: ${fallback.name}`);
        return fallback;
      }
    } catch (error) {
      console.warn(`Fallback OCR provider (${fallbackProvider}) failed:`, error);
    }

    // Try final fallback (Tesseract - always available)
    try {
      const final = this.getProvider(finalFallback);
      if (final.isConfigured()) {
        console.warn(`Using final fallback OCR provider: ${final.name}`);
        return final;
      }
    } catch (error) {
      console.warn(`Final fallback OCR provider (${finalFallback}) failed:`, error);
    }

    throw new Error('All OCR providers failed. This should not happen as Tesseract should always be available.');
  }

  static getAllProviders(): OCRProvider[] {
    return [
      new GoogleVisionProvider(),
      new OpenAIVisionProvider(),
      new TesseractOCRProvider(),
    ];
  }

  static getProviderStatus(): Record<string, { configured: boolean; capabilities: any }> {
    const providers = this.getAllProviders();
    const status: Record<string, { configured: boolean; capabilities: any }> = {};

    for (const provider of providers) {
      status[provider.name] = {
        configured: provider.isConfigured(),
        capabilities: provider.getCapabilities(),
      };
    }

    return status;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Extract text from an image using real OCR providers with retry logic and fallback
 */
export async function extractTextFromImage(imageUrl: string): Promise<OCRResult> {
  const errors: string[] = [];

  // Try OpenAI Vision first with retry logic
  const openaiProvider = OCRFactory.getProvider('openai_vision');
  if (openaiProvider.isConfigured()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Attempting OpenAI Vision OCR (attempt ${attempt}/2)`);
        return await openaiProvider.extractText(imageUrl);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`OpenAI Vision attempt ${attempt} failed: ${errorMsg}`);
        errors.push(`OpenAI attempt ${attempt}: ${errorMsg}`);

        // If rate limited, wait before retry (but only once)
        if (attempt === 1 && (errorMsg.includes('429') || errorMsg.includes('Too Many Requests'))) {
          const waitTime = 2000; // 2 second wait
          console.log(`Rate limited, waiting ${waitTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
  } else {
    errors.push('OpenAI Vision not configured');
  }

  // Try Google Vision as fallback
  const googleProvider = OCRFactory.getProvider('google_vision');
  if (googleProvider.isConfigured()) {
    try {
      console.log('Falling back to Google Vision OCR');
      return await googleProvider.extractText(imageUrl);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Google Vision failed: ${errorMsg}`);
      errors.push(`Google Vision: ${errorMsg}`);
    }
  } else {
    errors.push('Google Vision not configured');
  }

  // Try Tesseract as final fallback (always available)
  try {
    console.log('Falling back to Tesseract OCR (local processing)');
    const tesseractProvider = OCRFactory.getProvider('tesseract');
    return await tesseractProvider.extractText(imageUrl);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Tesseract OCR failed: ${errorMsg}`);
    errors.push(`Tesseract: ${errorMsg}`);
  }

  // If absolutely everything failed
  throw new Error(`All OCR providers failed: ${errors.join('; ')}`);
}

/**
 * Get OCR provider health status
 */
export function getOCRProviderStatus() {
  return OCRFactory.getProviderStatus();
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  GoogleVisionProvider,
  OpenAIVisionProvider,
  TesseractOCRProvider,
};

export default OCRFactory;
