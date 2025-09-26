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

// Tesseract PSM (Page Segmentation Mode) Constants
const PSM = {
  OSD_ONLY: 0,                    // Orientation and script detection (OSD) only
  AUTO_OSD: 1,                    // Automatic page segmentation with OSD
  AUTO_ONLY: 2,                   // Automatic page segmentation, but no OSD, or OCR
  AUTO: 3,                        // Fully automatic page segmentation, but no OSD (Default)
  SINGLE_COLUMN: 4,               // Assume a single column of text of variable sizes
  SINGLE_BLOCK_VERT_TEXT: 5,      // Assume a single uniform block of vertically aligned text
  SINGLE_BLOCK: 6,                // Assume a single uniform block of text
  SINGLE_LINE: 7,                 // Treat the image as a single text line
  SINGLE_WORD: 8,                 // Treat the image as a single word
  CIRCLE_WORD: 9,                 // Treat the image as a single word in a circle
  SINGLE_CHAR: 10,                // Treat the image as a single character
  SPARSE_TEXT: 11,                // Sparse text. Find as much text as possible in no particular order
  SPARSE_TEXT_OSD: 12,            // Sparse text with OSD
  RAW_LINE: 13                    // Raw line. Treat the image as a single text line, bypassing hacks
};

// Tesseract OEM (OCR Engine Mode) Constants
const OEM = {
  LEGACY_ONLY: 0,                 // Legacy engine only
  LSTM_ONLY: 1,                   // Neural nets LSTM engine only
  LEGACY_LSTM: 2,                 // Legacy + LSTM engines
  DEFAULT: 3                      // Default, based on what is available
};

class TesseractOCRProvider implements OCRProvider {
  name = 'Enhanced Tesseract OCR';
  private supportedLanguages = [
    'eng', 'spa', 'fra', 'deu', 'ita', 'por', 'rus', 'chi_sim', 'chi_tra', 
    'jpn', 'ara', 'hin', 'ben', 'kor', 'tha', 'vie', 'pol', 'nld', 'swe', 
    'dan', 'nor', 'fin', 'ces', 'hun', 'ron', 'bul', 'hrv', 'est', 'lav', 
    'lit', 'slk', 'slv', 'ell', 'tur', 'heb', 'far', 'urd'
  ];

  isConfigured(): boolean {
    // Tesseract is always available as it runs locally
    return true;
  }

  getCapabilities() {
    return {
      supportsMultipleLanguages: true,
      supportsBoundingBoxes: true,
      maxFileSize: 100, // MB - Increased limit for better quality
      supportedFormats: ['JPEG', 'PNG', 'GIF', 'WEBP', 'BMP', 'PDF', 'TIFF'],
      supportedLanguages: this.supportedLanguages,
      psmModes: PSM,
      oemModes: OEM,
    };
  }

  private getLanguageString(): string {
    // Prioritize English and Spanish for business signs, with fallback support
    const envLanguages = process.env.TESSERACT_LANGUAGES?.split(',') || ['eng', 'spa'];
    const validLanguages = envLanguages.filter(lang => this.supportedLanguages.includes(lang.trim()));
    return validLanguages.length > 0 ? validLanguages.join('+') : 'eng';
  }

  private getPageSegMode(): number {
    // Determine optimal PSM based on expected content type
    const contentType = process.env.TESSERACT_CONTENT_TYPE || 'business_sign';
    const customPSM = process.env.TESSERACT_PSM;
    
    if (customPSM) {
      return parseInt(customPSM, 10);
    }

    // Smart PSM selection based on content type
    switch (contentType) {
      case 'business_card':
        return PSM.SINGLE_BLOCK; // 6 - Business cards are usually single blocks
      case 'business_sign':
        return PSM.SPARSE_TEXT; // 11 - Signs can have text scattered around
      case 'document':
        return PSM.AUTO; // 3 - Documents benefit from automatic segmentation
      case 'single_line':
        return PSM.SINGLE_LINE; // 7 - For single line text like license plates
      case 'receipt':
        return PSM.SINGLE_COLUMN; // 4 - Receipts are typically single column
      default:
        return PSM.SINGLE_BLOCK; // 6 - Safe default for business content
    }
  }

  private getEngineMode(): number {
    // OEM_LSTM_ONLY = 1 is default for best accuracy with modern neural networks
    const mode = process.env.TESSERACT_OEM || '1';
    return parseInt(mode, 10);
  }

  private getWorkerConfig() {
    return {
      // Performance optimizations
      cacheMethod: process.env.TESSERACT_CACHE_METHOD || 'local',
      workerPath: process.env.TESSERACT_WORKER_PATH,
      corePath: process.env.TESSERACT_CORE_PATH,
      langPath: process.env.TESSERACT_LANG_PATH || 'https://tessdata.projectnaptha.com/4.0.0_best',
      
      // Enhanced logging
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`📝 Tesseract ${m.status}: ${Math.round(m.progress * 100)}%`);
        } else if (m.status === 'loading language traineddata') {
          console.log(`📚 Loading ${m.userJobId || 'language data'}: ${Math.round(m.progress * 100)}%`);
        } else if (m.status === 'initializing tesseract') {
          console.log(`🔧 Initializing Tesseract: ${Math.round(m.progress * 100)}%`);
        }
      },
      
      // Error handling
      errorHandler: (err: any) => {
        console.error('🚨 Tesseract Worker Error:', err);
      }
    };
  }

  async extractText(imageUrl: string): Promise<OCRResult> {
    const startTime = Date.now();
    let worker = null;

    try {
      console.log('🔍 Initializing Enhanced Tesseract OCR worker...');
      
      // Dynamic import for server-side usage
      const { createWorker } = await import('tesseract.js');

      // Get configuration
      const languages = this.getLanguageString();
      const psm = this.getPageSegMode();
      const oem = this.getEngineMode();
      const workerConfig = this.getWorkerConfig();

      console.log(`📚 Loading languages: ${languages} (PSM: ${psm}, OEM: ${oem})`);
      
      // Initialize worker with enhanced configuration
      worker = await createWorker(languages, oem, workerConfig);

      // Configure advanced OCR parameters for business content
      console.log('⚙️ Configuring Enhanced Tesseract parameters...');
      
      const parameters = this.getOptimizedParameters(psm);
      await worker.setParameters(parameters);

      console.log(`🖼️ Processing image with Enhanced Tesseract...`);
      
      // Perform OCR with additional output options for debugging
      const recognitionOptions = this.getRecognitionOptions();
      const outputOptions = this.getOutputOptions();
      
      const { data } = await worker.recognize(imageUrl, recognitionOptions, outputOptions);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Enhanced Tesseract completed in ${processingTime}ms`);
      console.log(`📊 Results: ${data.text.length} chars, confidence: ${data.confidence}%, words: ${data.words?.length || 0}`);

      // Enhanced post-processing with confidence filtering
      const result = this.processRecognitionResults(data, languages, psm, oem, processingTime);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Enhanced Tesseract OCR failed:', errorMessage);
      
      // Provide helpful error context
      this.logErrorContext(error, imageUrl);
      
      throw new Error(`Enhanced Tesseract OCR failed: ${errorMessage}`);
    } finally {
      // Always terminate worker to free memory
      await this.safelyTerminateWorker(worker);
    }
  }

  private getOptimizedParameters(psm: number) {
    // Base parameters optimized for business content
    const baseParams = {
      tessedit_pageseg_mode: psm.toString(),
      preserve_interword_spaces: '1',
      tessedit_do_invert: '0',
      
      // Character whitelist optimized for business signs and documents
      tessedit_char_whitelist: this.getCharacterWhitelist(),
      
      // Text detection optimizations
      textord_really_old_xheight: '1',
      textord_min_xheight: '10',
      tessedit_single_match: '0',
      
      // Quality settings
      tessedit_write_images: '0', // Don't write debug images
      user_defined_dpi: process.env.TESSERACT_DPI || '300', // High DPI for better accuracy
    };

    // PSM-specific optimizations
    switch (psm) {
      case PSM.SPARSE_TEXT:
        return {
          ...baseParams,
          textord_tabfind_find_tables: '1',
          textord_tablefind_good_neighbours: '1',
        };
      case PSM.SINGLE_LINE:
        return {
          ...baseParams,
          tessedit_single_match: '1',
          classify_enable_learning: '0',
        };
      case PSM.AUTO:
        return {
          ...baseParams,
          textord_really_old_xheight: '0', // Let auto-detection handle this
        };
      default:
        return baseParams;
    }
  }

  private getCharacterWhitelist(): string {
    const contentType = process.env.TESSERACT_CONTENT_TYPE || 'business_sign';

    // Base character set for business content
    const baseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,()-';
    const businessChars = '@#$%&+/:;?!\'"';

    switch (contentType) {
      case 'phone_numbers':
        return '0123456789 ()-+.';
      case 'addresses':
        return baseChars + businessChars + '#';
      case 'business_signs':
        // Simplified character set to avoid parsing issues
        return baseChars + businessChars;
      case 'licenses':
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -';
      default:
        return baseChars + businessChars;
    }
  }

  private getRecognitionOptions() {
    return {
      rotateAuto: process.env.TESSERACT_AUTO_ROTATE !== 'false',
      rectangle: this.getRegionOfInterest(),
    };
  }

  private getRegionOfInterest() {
    // Allow custom region specification via environment variables
    const roi = process.env.TESSERACT_ROI;
    if (roi) {
      const [left, top, width, height] = roi.split(',').map(Number);
      return { left, top, width, height };
    }
    return undefined; // Process entire image
  }

  private getOutputOptions() {
    return {
      text: true,
      blocks: true,
      hocr: false, // Disable unless needed to save memory
      tsv: false,
      pdf: false,
      imageColor: process.env.TESSERACT_DEBUG_IMAGES === 'true',
      imageGrey: process.env.TESSERACT_DEBUG_IMAGES === 'true',
      imageBinary: process.env.TESSERACT_DEBUG_IMAGES === 'true',
    };
  }

  private processRecognitionResults(data: any, languages: string, psm: number, oem: number, processingTime: number): OCRResult {
    // Enhanced confidence filtering with dynamic thresholds
    const minWordConfidence = this.getMinWordConfidence(psm);
    
    const boundingBoxes = data.words?.filter((word: any) => 
      word.confidence >= minWordConfidence && 
      word.text.trim().length > 0 &&
      this.isValidWord(word.text.trim())
    ).map((word: any) => ({
      text: word.text.trim(),
      x: word.bbox.x0,
      y: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      height: word.bbox.y1 - word.bbox.y0,
      confidence: word.confidence / 100,
    })) || [];

    // Enhanced text cleaning and structuring
    const cleanedText = this.cleanExtractedText(data.text);
    const detectedLanguage = this.detectPrimaryLanguage(data, languages);
    const overallConfidence = this.calculateOverallConfidence(data, boundingBoxes);

    return {
      text: cleanedText,
      confidence: overallConfidence,
      boundingBoxes,
      detectedLanguage,
      processingTime,
      provider: 'enhanced-tesseract',
      metadata: {
        originalConfidence: data.confidence,
        languagesUsed: languages,
        pageSegMode: psm,
        engineMode: oem,
        wordsDetected: boundingBoxes.length,
        avgWordConfidence: boundingBoxes.length > 0 
          ? boundingBoxes.reduce((sum, box) => sum + box.confidence, 0) / boundingBoxes.length 
          : 0,
        totalWords: data.words?.length || 0,
        filteredWords: (data.words?.length || 0) - boundingBoxes.length,
        blocksDetected: data.blocks?.length || 0,
        paragraphsDetected: data.paragraphs?.length || 0,
        linesDetected: data.lines?.length || 0,
      }
    };
  }

  private getMinWordConfidence(psm: number): number {
    // Adjust confidence thresholds based on PSM mode
    switch (psm) {
      case PSM.SPARSE_TEXT:
        return 40; // More lenient for sparse text
      case PSM.SINGLE_LINE:
      case PSM.SINGLE_WORD:
        return 60; // Stricter for focused content
      case PSM.AUTO:
        return 50; // Balanced for automatic detection
      default:
        return 30; // Default threshold
    }
  }

  private isValidWord(text: string): boolean {
    // Filter out obvious OCR errors
    if (text.length < 1) return false;
    if (text.length === 1 && /[^\w]/.test(text)) return false; // Single non-word characters
    if (/^[.,-]{2,}$/.test(text)) return false; // Only punctuation
    return true;
  }

  private calculateOverallConfidence(data: any, filteredWords: any[]): number {
    // Weighted confidence calculation
    if (filteredWords.length === 0) return 0.1;
    
    const wordConfidenceSum = filteredWords.reduce((sum, word) => sum + word.confidence, 0);
    const avgWordConfidence = wordConfidenceSum / filteredWords.length;
    
    // Factor in Tesseract's overall confidence
    const tesseractConfidence = data.confidence / 100;
    
    // Weighted average (70% word confidence, 30% overall confidence)
    const finalConfidence = (avgWordConfidence * 0.7) + (tesseractConfidence * 0.3);
    
    return Math.max(0.1, Math.min(1.0, finalConfidence));
  }

  private async safelyTerminateWorker(worker: any) {
    if (worker) {
      try {
        await worker.terminate();
        console.log('🧹 Enhanced Tesseract worker terminated successfully');
      } catch (terminateError) {
        console.warn('⚠️ Warning: Failed to terminate Tesseract worker:', terminateError);
      }
    }
  }

  private logErrorContext(error: any, imageUrl: string) {
    console.error('🔍 OCR Error Context:', {
      imageUrl: imageUrl.substring(0, 100) + '...',
      languages: this.getLanguageString(),
      psm: this.getPageSegMode(),
      oem: this.getEngineMode(),
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private cleanExtractedText(rawText: string): string {
    return rawText
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive newlines
      .replace(/\s{3,}/g, ' ') // Reduce excessive spaces
      .replace(/[^\w\s.,()-@#$%&+/:;?!'"]/g, '') // Remove weird characters
      .trim();
  }

  private detectPrimaryLanguage(data: any, languagesUsed: string): string {
    // Simple heuristic: if confidence is high and using multiple languages, 
    // assume primary is English unless Spanish characters are prevalent
    if (languagesUsed.includes('spa') && languagesUsed.includes('eng')) {
      const spanishChars = (data.text.match(/[ñáéíóúüÑÁÉÍÓÚÜ]/g) || []).length;
      const totalChars = data.text.replace(/\s/g, '').length;
      return spanishChars / totalChars > 0.1 ? 'es' : 'en';
    }
    return languagesUsed.split('+')[0] === 'eng' ? 'en' : languagesUsed.split('+')[0];
  }
}

// =============================================================================
// OCR FACTORY
// =============================================================================

export type OCRProviderType = 'google_vision' | 'openai_vision' | 'tesseract';

export class OCRFactory {
  private static providers: Map<OCRProviderType, OCRProvider> = new Map();

  static getProvider(type?: OCRProviderType): OCRProvider {
    // If no type specified, use configuration - Default to Tesseract for local processing
    if (!type) {
      type = (process.env.OCR_PROVIDER as OCRProviderType) || 'tesseract';
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
    const primaryProvider = process.env.OCR_PRIMARY_PROVIDER as OCRProviderType || 'tesseract';
    const fallbackProvider = process.env.OCR_FALLBACK_PROVIDER as OCRProviderType || 'openai_vision';
    const finalFallback = process.env.OCR_FINAL_FALLBACK as OCRProviderType || 'google_vision';

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
/**
 * Enhanced OCR extraction with Tesseract as primary provider
 * Uses intelligent fallback logic with provider prioritization
 */
export async function extractTextFromImage(imageUrl: string): Promise<OCRResult> {
  const errors: string[] = [];
  const startTime = Date.now();

  console.log('🔍 Starting Enhanced OCR extraction pipeline...');

  // Primary: Enhanced Tesseract (local processing, always available)
  try {
    console.log('🥇 Attempting Enhanced Tesseract OCR (primary)');
    const tesseractProvider = OCRFactory.getProvider('tesseract');
    const result = await tesseractProvider.extractText(imageUrl);
    
    console.log(`✅ Enhanced Tesseract succeeded in ${Date.now() - startTime}ms`);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`❌ Enhanced Tesseract failed: ${errorMsg}`);
    errors.push(`Enhanced Tesseract: ${errorMsg}`);
  }

  // Fallback 1: OpenAI Vision (for complex/poor quality images)
  const openaiProvider = OCRFactory.getProvider('openai_vision');
  if (openaiProvider.isConfigured()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🥈 Attempting OpenAI Vision OCR (fallback ${attempt}/2)`);
        const result = await openaiProvider.extractText(imageUrl);
        
        console.log(`✅ OpenAI Vision succeeded on attempt ${attempt} in ${Date.now() - startTime}ms`);
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`❌ OpenAI Vision attempt ${attempt} failed: ${errorMsg}`);
        errors.push(`OpenAI attempt ${attempt}: ${errorMsg}`);

        // If rate limited, wait before retry (but only once)
        if (attempt === 1 && (errorMsg.includes('429') || errorMsg.includes('Too Many Requests'))) {
          const waitTime = 2000; // 2 second wait
          console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
  } else {
    console.log('⚠️ OpenAI Vision not configured, skipping');
    errors.push('OpenAI Vision not configured');
  }

  // Fallback 2: Google Vision (legacy support)
  const googleProvider = OCRFactory.getProvider('google_vision');
  if (googleProvider.isConfigured()) {
    try {
      console.log('🥉 Attempting Google Vision OCR (final fallback)');
      const result = await googleProvider.extractText(imageUrl);
      
      console.log(`✅ Google Vision succeeded in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`❌ Google Vision failed: ${errorMsg}`);
      errors.push(`Google Vision: ${errorMsg}`);
    }
  } else {
    console.log('⚠️ Google Vision not configured, skipping');
    errors.push('Google Vision not configured');
  }

  // If we reach here, all providers have failed
  const totalTime = Date.now() - startTime;
  const errorSummary = errors.join(' | ');
  
  console.error(`💥 All OCR providers failed after ${totalTime}ms: ${errorSummary}`);
  throw new Error(`All OCR providers failed after ${totalTime}ms. Errors: ${errorSummary}`);
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
