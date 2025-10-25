/**
 * OCR Service - Simplified for web app integration
 * Uses OpenAI Vision API for text extraction from images
 */

interface OCRResult {
  text: string;
  confidence: number;
  businessName?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  address?: string;
  services?: string[];
}

export class OCRService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY not configured - OCR will not work');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Extract text and business information from image buffer
   */
  async extractBusinessInfo(imageBuffer: Buffer): Promise<OCRResult> {
    if (!this.isConfigured()) {
      throw new Error('OCR service not configured - OPENAI_API_KEY missing');
    }

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = this.detectMimeType(imageBuffer);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    console.log('Starting OCR with OpenAI Vision...');
    console.log(`Image size: ${imageBuffer.length} bytes`);

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
                  text: `Analyze this business image and extract ALL visible text and information. Return a JSON object with:
{
  "businessName": "Name of the business",
  "phoneNumber": "Phone number in format ###-###-####",
  "email": "Email address if visible",
  "website": "Website URL",
  "address": "Physical address",
  "services": ["List", "of", "services", "offered"],
  "allText": "All text found in the image exactly as it appears"
}

If any field is not found, use null. Be thorough and extract every piece of text visible.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API Error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse the JSON response
      const extracted = JSON.parse(content);
      console.log('OCR extraction successful:', extracted);

      // Calculate confidence based on extracted data
      let confidence = 0.7;
      if (extracted.businessName) confidence += 0.1;
      if (extracted.phoneNumber) confidence += 0.1;
      if (extracted.email || extracted.website) confidence += 0.1;

      return {
        text: extracted.allText || '',
        confidence: Math.min(confidence, 1.0),
        businessName: extracted.businessName || undefined,
        phoneNumber: this.formatPhoneNumber(extracted.phoneNumber),
        email: extracted.email || undefined,
        website: this.formatWebsite(extracted.website),
        address: extracted.address || undefined,
        services: Array.isArray(extracted.services) ? extracted.services : undefined,
      };

    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect MIME type from buffer
   */
  private detectMimeType(buffer: Buffer): string {
    const signatures: { [key: string]: string } = {
      'FFD8FF': 'image/jpeg',
      '89504E47': 'image/png',
      '47494638': 'image/gif',
      '52494646': 'image/webp',
    };

    const hex = buffer.toString('hex', 0, 4).toUpperCase();
    
    for (const [signature, mimeType] of Object.entries(signatures)) {
      if (hex.startsWith(signature)) {
        return mimeType;
      }
    }

    return 'image/jpeg'; // Default fallback
  }

  /**
   * Format phone number to standard format
   */
  private formatPhoneNumber(phone?: string | null): string | undefined {
    if (!phone) return undefined;
    
    // Extract digits
    const digits = phone.replace(/\D/g, '');
    
    // Format as ###-###-####
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    return phone; // Return as-is if can't format
  }

  /**
   * Format website URL
   */
  private formatWebsite(website?: string | null): string | undefined {
    if (!website) return undefined;
    
    // Add https:// if missing
    if (!website.match(/^https?:\/\//i)) {
      return `https://${website}`;
    }
    
    return website;
  }
}

// Export singleton instance
export const ocrService = new OCRService();
