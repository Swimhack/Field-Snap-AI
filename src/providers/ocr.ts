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
          model: 'gpt-4-vision-preview',
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
// MOCK PROVIDER (FOR DEVELOPMENT/TESTING)
// =============================================================================

class MockOCRProvider implements OCRProvider {
  name = 'Mock OCR';

  isConfigured(): boolean {
    return process.env.MOCK_OCR === 'true';
  }

  getCapabilities() {
    return {
      supportsMultipleLanguages: true,
      supportsBoundingBoxes: true,
      maxFileSize: 100,
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'WEBP', 'BMP'],
    };
  }

  async extractText(imageUrl: string): Promise<OCRResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockResults = [
      {
        text: `ABC Plumbing Services
Phone: (555) 123-4567
Email: info@abcplumbing.com
www.abcplumbing.com
24/7 Emergency Service
Licensed & Insured
Drain Cleaning • Water Heaters • Pipe Repair`,
        businessName: 'ABC Plumbing Services',
      },
      {
        text: `Maria's Landscaping
(555) 987-6543
mariaslandscaping@email.com
Professional Tree Trimming
Lawn Maintenance
Garden Design
Free Estimates!`,
        businessName: 'Maria\'s Landscaping',
      },
      {
        text: `Johnson Electrical
Licensed Electrician
Call: 555-456-7890
johnson.electric@gmail.com
Residential & Commercial
Wiring • Outlets • Panel Upgrades
Available Weekends`,
        businessName: 'Johnson Electrical',
      },
    ];

    const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];

    return {
      text: randomResult.text,
      confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
      boundingBoxes: [
        {
          text: randomResult.businessName,
          x: 50,
          y: 20,
          width: 200,
          height: 30,
          confidence: 0.95,
        },
      ],
      detectedLanguage: 'en',
      processingTime: 1000,
    };
  }
}

// =============================================================================
// OCR FACTORY
// =============================================================================

export type OCRProviderType = 'google_vision' | 'openai_vision' | 'mock';

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
      case 'mock':
        provider = new MockOCRProvider();
        break;
      default:
        throw new Error(`Unknown OCR provider: ${type}`);
    }

    // Cache the provider
    this.providers.set(type, provider);
    return provider;
  }

  static async getConfiguredProvider(): Promise<OCRProvider> {
    const primaryProvider = process.env.OCR_PRIMARY_PROVIDER as OCRProviderType || 'google_vision';
    const fallbackProvider = process.env.OCR_FALLBACK_PROVIDER as OCRProviderType || 'openai_vision';

    // Try primary provider first
    try {
      const primary = this.getProvider(primaryProvider);
      if (primary.isConfigured()) {
        return primary;
      }
    } catch (error) {
      console.warn(`Primary OCR provider (${primaryProvider}) failed:`, error);
    }

    // Try fallback provider
    try {
      const fallback = this.getProvider(fallbackProvider);
      if (fallback.isConfigured()) {
        console.warn(`Using fallback OCR provider: ${fallback.name}`);
        return fallback;
      }
    } catch (error) {
      console.warn(`Fallback OCR provider (${fallbackProvider}) failed:`, error);
    }

    // Use mock provider if in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock OCR provider for development');
      return this.getProvider('mock');
    }

    throw new Error('No OCR provider is configured and available');
  }

  static getAllProviders(): OCRProvider[] {
    return [
      new GoogleVisionProvider(),
      new OpenAIVisionProvider(),
      new MockOCRProvider(),
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
 * Extract text from an image using the configured OCR provider
 */
export async function extractTextFromImage(imageUrl: string): Promise<OCRResult> {
  const provider = await OCRFactory.getConfiguredProvider();
  
  try {
    return await provider.extractText(imageUrl);
  } catch (error) {
    // Log the error and throw a user-friendly message
    console.error(`OCR extraction failed with provider ${provider.name}:`, error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  MockOCRProvider,
};

export default OCRFactory;
