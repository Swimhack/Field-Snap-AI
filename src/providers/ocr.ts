/**
 * @file Manages Optical Character Recognition (OCR) providers.
 *
 * This module defines a common interface for OCR services and provides
 * implementations for various providers (e.g., Google Cloud Vision, OpenAI Vision).
 * A factory function allows swapping the active provider via environment variables.
 */

// --- Interfaces ---

/**
 * The structured result from an OCR provider.
 */
export interface OcrResult {
  /** The full, raw text extracted from the image. */
  rawText: string;
  /** Optional: Provider-specific structured data, like text annotations with bounding boxes. */
  annotations?: any;
}

/**
 * The common interface for any OCR provider.
 */
export interface OcrProvider {
  extractText(imageUrl: string): Promise<OcrResult>;
}

// --- Implementations ---

/**
 * Extracts text from an image using Google Cloud Vision API.
 * This is the default provider.
 *
 * @param imageUrl The public URL of the image to analyze.
 * @returns A promise that resolves to the OCR result.
 */
export async function googleVisionOcr(imageUrl: string): Promise<OcrResult> {
  // TODO: Implement Google Cloud Vision API call.
  // 1. Authenticate using Application Default Credentials (ADC).
  // 2. Use the @google-cloud/vision client library.
  // 3. Call `client.textDetection(imageUrl)`.
  // 4. Parse the fullTextAnnotation from the response.
  console.log(`[googleVisionOcr] Processing image: ${imageUrl}`);
  // This is a placeholder.
  return {
    rawText: "Sample OCR text from Google Vision: Acme Corp, (555) 123-4567, Quality Landscaping",
  };
}

/**
 * Extracts text from an image using OpenAI's Vision API (GPT-4V).
 *
 * @param imageUrl The public URL of the image to analyze.
 * @returns A promise that resolves to the OCR result.
 */
export async function openaiVisionOcr(imageUrl: string): Promise<OcrResult> {
  // TODO: Implement OpenAI Vision API call.
  // 1. Authenticate using OPENAI_API_KEY.
  // 2. Use the `openai` client library.
  // 3. Call the chat completions endpoint with a vision model (e.g., 'gpt-4-vision-preview').
  // 4. The prompt should instruct the model to extract all visible text.
  console.log(`[openaiVisionOcr] Processing image: ${imageUrl}`);
  // This is a placeholder.
  return {
    rawText: "Sample OCR text from OpenAI Vision: Acme Corp, (555) 123-4567, Quality Landscaping",
  };
}

// --- Factory ---

/**
 * Gets the configured OCR provider based on the `OCR_PROVIDER` environment variable.
 * Defaults to Google Cloud Vision if the variable is not set or is invalid.
 *
 * @returns An object that conforms to the OcrProvider interface.
 */
export function getOcrProvider(): OcrProvider {
  const providerType = process.env.OCR_PROVIDER || 'google';

  switch (providerType) {
    case 'openai':
      console.log('Using OpenAI Vision for OCR.');
      return { extractText: openaiVisionOcr };
    case 'google':
      console.log('Using Google Cloud Vision for OCR.');
      return { extractText: googleVisionOcr };
    default:
      console.warn(
        `Unsupported OCR_PROVIDER "${providerType}". Defaulting to "google".`
      );
      return { extractText: googleVisionOcr };
  }
}
