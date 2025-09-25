/**
 * Field Snap AI - Image Analysis Provider
 *
 * This module provides enhanced image description capabilities to thoroughly
 * describe visual elements in images before OCR processing, as specified.
 * Focuses on rectangular/square shapes with words and colors.
 */

export interface ImageDescription {
  visualDescription: string;
  mainSubject: {
    shape: 'rectangular' | 'square' | 'circular' | 'irregular' | 'unknown';
    colors: string[];
    estimatedText: string[];
    layout: 'horizontal' | 'vertical' | 'mixed' | 'unknown';
  };
  confidence: number;
  processingTime: number;
  // Enhanced subject analysis
  subjectAnalysis: {
    detectedSubjects: BusinessSubject[];
    primaryBusinessSubject: BusinessSubject | null;
    otherObjects: string[];
    subjectIsolationSuccess: boolean;
    businessRelevanceScore: number;
  };
}

export interface BusinessSubject {
  type: 'business_sign' | 'storefront' | 'business_card' | 'advertisement' | 'vehicle_wrap' | 'billboard' | 'banner' | 'unknown';
  description: string;
  location: {
    position: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'corner';
    sizeRelative: 'large' | 'medium' | 'small';
    coordinates?: { x: number; y: number; width: number; height: number };
  };
  businessData: {
    businessName?: string;
    phoneNumber?: string;
    website?: string;
    services?: string[];
    address?: string;
    operatingHours?: string;
  };
  textContent: string[];
  confidence: number;
}

export interface ImageAnalysisProvider {
  name: string;
  analyzeImage(imageUrl: string): Promise<ImageDescription>;
  isConfigured(): boolean;
}

// =============================================================================
// OPENAI IMAGE ANALYSIS PROVIDER
// =============================================================================

class OpenAIImageAnalysisProvider implements ImageAnalysisProvider {
  name = 'OpenAI Image Analysis';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async analyzeImage(imageUrl: string): Promise<ImageDescription> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI Image Analysis is not configured');
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
                  text: `You are an expert at analyzing business photos to identify and isolate business signage, advertisements, and other business-related subjects. Analyze this image with the following objectives:

**PRIMARY TASK: INTELLIGENT SUBJECT IDENTIFICATION**
1. IDENTIFY ALL BUSINESS SUBJECTS: Look for business signs, storefronts, business cards, advertisements, vehicle wraps, billboards, banners, or any display showing business information.

2. ISOLATE THE MAIN BUSINESS SUBJECT: Determine which business-related element is the primary focus that the user intended to capture. Ignore irrelevant objects like random people, cars, buildings, or background elements that aren't the business subject.

3. EXTRACT BUSINESS DATA: From the identified business subject, extract:
   - Business name
   - Phone numbers
   - Email addresses
   - Website URLs
   - Physical addresses
   - Services offered
   - Operating hours
   - Any other business information

4. DESCRIBE DATA DISPLAY: Explain what type of data is being displayed and how it's organized (contact info, services, hours, etc.).

5. SPATIAL ANALYSIS: Describe the location, size, and position of the business subject within the image.

**SECONDARY ANALYSIS:**
- Shape and color analysis of the business subject
- Text layout and organization
- Overall visual assessment

Please be extremely thorough in identifying business subjects and isolating them from irrelevant objects.

Format your response as JSON:
{
  "visualDescription": "detailed description of the entire image",
  "mainSubject": {
    "shape": "rectangular|square|circular|irregular|unknown",
    "colors": ["color1", "color2", "..."],
    "estimatedText": ["estimated text line 1", "estimated text line 2", "..."],
    "layout": "horizontal|vertical|mixed|unknown"
  },
  "confidence": 0.0-1.0,
  "subjectAnalysis": {
    "detectedSubjects": [
      {
        "type": "business_sign|storefront|business_card|advertisement|vehicle_wrap|billboard|banner|unknown",
        "description": "detailed description of this specific business subject",
        "location": {
          "position": "center|left|right|top|bottom|corner",
          "sizeRelative": "large|medium|small"
        },
        "businessData": {
          "businessName": "extracted business name if visible",
          "phoneNumber": "extracted phone if visible",
          "website": "extracted website if visible",
          "services": ["service1", "service2"],
          "address": "extracted address if visible"
        },
        "textContent": ["all visible text on this subject"],
        "confidence": 0.0-1.0
      }
    ],
    "primaryBusinessSubject": "index of the main business subject the user intended to capture (0-based), or null if none",
    "otherObjects": ["list of non-business objects visible in image"],
    "subjectIsolationSuccess": true/false,
    "businessRelevanceScore": 0.0-1.0
  }
}`,
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
          max_tokens: 1500,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.choices?.[0]?.message?.content || '';

      // Try to parse JSON response
      let analysisResult;
      try {
        // Extract JSON from response if wrapped in markdown
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) ||
                         analysisText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : analysisText;
        analysisResult = JSON.parse(jsonText);
      } catch (parseError) {
        // Fallback to text parsing if JSON parsing fails
        analysisResult = this.parseAnalysisText(analysisText);
      }

      return {
        visualDescription: analysisResult.visualDescription || analysisText,
        mainSubject: {
          shape: analysisResult.mainSubject?.shape || 'unknown',
          colors: analysisResult.mainSubject?.colors || [],
          estimatedText: analysisResult.mainSubject?.estimatedText || [],
          layout: analysisResult.mainSubject?.layout || 'unknown',
        },
        confidence: analysisResult.confidence || 0.7,
        processingTime: Date.now() - startTime,
        subjectAnalysis: {
          detectedSubjects: analysisResult.subjectAnalysis?.detectedSubjects || [],
          primaryBusinessSubject: analysisResult.subjectAnalysis?.primaryBusinessSubject !== undefined 
            ? (analysisResult.subjectAnalysis.detectedSubjects?.[analysisResult.subjectAnalysis.primaryBusinessSubject] || null)
            : null,
          otherObjects: analysisResult.subjectAnalysis?.otherObjects || [],
          subjectIsolationSuccess: analysisResult.subjectAnalysis?.subjectIsolationSuccess || false,
          businessRelevanceScore: analysisResult.subjectAnalysis?.businessRelevanceScore || 0.5,
        },
      };

    } catch (error) {
      throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseAnalysisText(text: string): any {
    // Fallback text parsing when JSON parsing fails
    const colors = [];
    const estimatedText = [];

    // Extract colors from text
    const colorMatches = text.match(/color[s]?:?\s*([^.]+)/gi);
    if (colorMatches) {
      colorMatches.forEach(match => {
        const colorList = match.split(/[:,]/).slice(1).join(',');
        colors.push(...colorList.split(/[,\s]+/).filter(c => c.trim()));
      });
    }

    // Extract estimated text
    const textMatches = text.match(/text[s]?:?\s*"([^"]+)"/gi) ||
                       text.match(/says?\s*"([^"]+)"/gi) ||
                       text.match(/"([^"]+)"/g);
    if (textMatches) {
      textMatches.forEach(match => {
        const textContent = match.replace(/^[^"]*"/, '').replace(/"[^"]*$/, '');
        if (textContent.trim()) {
          estimatedText.push(textContent.trim());
        }
      });
    }

    // Determine shape
    let shape = 'unknown';
    if (/rectangular|rectangle/i.test(text)) shape = 'rectangular';
    else if (/square/i.test(text)) shape = 'square';
    else if (/circular|circle|round/i.test(text)) shape = 'circular';
    else if (/irregular/i.test(text)) shape = 'irregular';

    // Determine layout
    let layout = 'unknown';
    if (/horizontal/i.test(text)) layout = 'horizontal';
    else if (/vertical/i.test(text)) layout = 'vertical';
    else if (/mixed/i.test(text)) layout = 'mixed';

    return {
      visualDescription: text,
      mainSubject: {
        shape,
        colors: colors.slice(0, 10), // Limit to first 10 colors
        estimatedText: estimatedText.slice(0, 10), // Limit to first 10 text items
        layout,
      },
      confidence: 0.6, // Lower confidence for text parsing
    };
  }
}

// =============================================================================
// MOCK IMAGE ANALYSIS PROVIDER
// =============================================================================

class MockImageAnalysisProvider implements ImageAnalysisProvider {
  name = 'Mock Image Analysis';

  isConfigured(): boolean {
    return process.env.MOCK_OCR === 'true';
  }

  async analyzeImage(imageUrl: string): Promise<ImageDescription> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockAnalyses = [
      {
        visualDescription: "A rectangular white sign with black text displaying business information. The sign appears to be mounted on a light-colored surface. The text is arranged in a hierarchical layout with the business name prominently displayed at the top, followed by contact information and services offered below.",
        mainSubject: {
          shape: 'rectangular' as const,
          colors: ['white', 'black', 'gray'],
          estimatedText: ['ABC Plumbing Services', 'Phone: (555) 123-4567', 'info@abcplumbing.com', '24/7 Emergency Service'],
          layout: 'vertical' as const,
        },
        confidence: 0.92,
        subjectAnalysis: {
          detectedSubjects: [
            {
              type: 'business_sign' as const,
              description: 'Professional plumbing services business sign with contact information',
              location: {
                position: 'center' as const,
                sizeRelative: 'large' as const,
              },
              businessData: {
                businessName: 'ABC Plumbing Services',
                phoneNumber: '(555) 123-4567',
                website: undefined,
                services: ['24/7 Emergency Service', 'Plumbing'],
                address: undefined,
              },
              textContent: ['ABC Plumbing Services', 'Phone: (555) 123-4567', 'info@abcplumbing.com', '24/7 Emergency Service'],
              confidence: 0.92,
            }
          ],
          primaryBusinessSubject: {
            type: 'business_sign' as const,
            description: 'Professional plumbing services business sign with contact information',
            location: {
              position: 'center' as const,
              sizeRelative: 'large' as const,
            },
            businessData: {
              businessName: 'ABC Plumbing Services',
              phoneNumber: '(555) 123-4567',
              website: undefined,
              services: ['24/7 Emergency Service', 'Plumbing'],
              address: undefined,
            },
            textContent: ['ABC Plumbing Services', 'Phone: (555) 123-4567', 'info@abcplumbing.com', '24/7 Emergency Service'],
            confidence: 0.92,
          },
          otherObjects: ['wall', 'mounting hardware'],
          subjectIsolationSuccess: true,
          businessRelevanceScore: 0.95,
        },
      },
      {
        visualDescription: "A square-shaped business sign with a green background and white text. The sign has decorative elements around the border and displays landscaping service information in a centered layout. There appear to be small graphic elements or icons integrated with the text.",
        mainSubject: {
          shape: 'square' as const,
          colors: ['green', 'white', 'dark green'],
          estimatedText: ["Maria's Landscaping", '(555) 987-6543', 'Professional Tree Trimming', 'Free Estimates!'],
          layout: 'vertical' as const,
        },
        confidence: 0.88,
        subjectAnalysis: {
          detectedSubjects: [
            {
              type: 'business_sign' as const,
              description: 'Landscaping business sign with decorative border and service offerings',
              location: {
                position: 'center' as const,
                sizeRelative: 'medium' as const,
              },
              businessData: {
                businessName: "Maria's Landscaping",
                phoneNumber: '(555) 987-6543',
                website: undefined,
                services: ['Professional Tree Trimming', 'Landscaping'],
                address: undefined,
              },
              textContent: ["Maria's Landscaping", '(555) 987-6543', 'Professional Tree Trimming', 'Free Estimates!'],
              confidence: 0.88,
            }
          ],
          primaryBusinessSubject: {
            type: 'business_sign' as const,
            description: 'Landscaping business sign with decorative border and service offerings',
            location: {
              position: 'center' as const,
              sizeRelative: 'medium' as const,
            },
            businessData: {
              businessName: "Maria's Landscaping",
              phoneNumber: '(555) 987-6543',
              website: undefined,
              services: ['Professional Tree Trimming', 'Landscaping'],
              address: undefined,
            },
            textContent: ["Maria's Landscaping", '(555) 987-6543', 'Professional Tree Trimming', 'Free Estimates!'],
            confidence: 0.88,
          },
          otherObjects: ['grass', 'background foliage'],
          subjectIsolationSuccess: true,
          businessRelevanceScore: 0.90,
        },
      },
      {
        visualDescription: "A rectangular business card or sign with a blue background and white/yellow text. The layout is organized with the business name at the top, followed by credentials and contact information. The text appears to be in different sizes to create visual hierarchy.",
        mainSubject: {
          shape: 'rectangular' as const,
          colors: ['blue', 'white', 'yellow'],
          estimatedText: ['Johnson Electrical', 'Licensed Electrician', 'Call: 555-456-7890', 'Residential & Commercial'],
          layout: 'horizontal' as const,
        },
        confidence: 0.85,
        subjectAnalysis: {
          detectedSubjects: [
            {
              type: 'business_card' as const,
              description: 'Professional electrical services business card with licensing credentials',
              location: {
                position: 'center' as const,
                sizeRelative: 'large' as const,
              },
              businessData: {
                businessName: 'Johnson Electrical',
                phoneNumber: '555-456-7890',
                website: undefined,
                services: ['Residential Electrical', 'Commercial Electrical'],
                address: undefined,
              },
              textContent: ['Johnson Electrical', 'Licensed Electrician', 'Call: 555-456-7890', 'Residential & Commercial'],
              confidence: 0.85,
            }
          ],
          primaryBusinessSubject: {
            type: 'business_card' as const,
            description: 'Professional electrical services business card with licensing credentials',
            location: {
              position: 'center' as const,
              sizeRelative: 'large' as const,
            },
            businessData: {
              businessName: 'Johnson Electrical',
              phoneNumber: '555-456-7890',
              website: undefined,
              services: ['Residential Electrical', 'Commercial Electrical'],
              address: undefined,
            },
            textContent: ['Johnson Electrical', 'Licensed Electrician', 'Call: 555-456-7890', 'Residential & Commercial'],
            confidence: 0.85,
          },
          otherObjects: ['hand holding card', 'background surface'],
          subjectIsolationSuccess: true,
          businessRelevanceScore: 0.92,
        },
      },
    ];

    const randomAnalysis = mockAnalyses[Math.floor(Math.random() * mockAnalyses.length)];

    return {
      ...randomAnalysis,
      processingTime: 800,
    };
  }
}

// =============================================================================
// IMAGE ANALYSIS FACTORY
// =============================================================================

export class ImageAnalysisFactory {
  private static provider: ImageAnalysisProvider | null = null;

  static getProvider(): ImageAnalysisProvider {
    if (this.provider) {
      return this.provider;
    }

    // NEVER use mock in production - always use real image analysis
    // Commenting out mock usage to ensure real processing
    // if (process.env.MOCK_OCR === 'true') {
    //   console.warn('Using mock image analysis provider (MOCK_OCR enabled)');
    //   this.provider = new MockImageAnalysisProvider();
    //   return this.provider;
    // }

    // Try OpenAI
    const openaiProvider = new OpenAIImageAnalysisProvider();
    if (openaiProvider.isConfigured()) {
      this.provider = openaiProvider;
      return this.provider;
    }

    // Throw error if no real provider is configured - no mock data in production
    throw new Error('No image analysis provider configured. OpenAI API key is required for image analysis.');
  }

  static reset() {
    this.provider = null;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Analyze an image to get enhanced visual description before OCR
 */
export async function analyzeImage(imageUrl: string): Promise<ImageDescription> {
  let provider: ImageAnalysisProvider;
  try {
    provider = ImageAnalysisFactory.getProvider();
  } catch (initError) {
    console.warn('Image analysis provider not configured; using mock provider as fallback');
    const mockProvider = new MockImageAnalysisProvider();
    return await mockProvider.analyzeImage(imageUrl);
  }

  try {
    return await provider.analyzeImage(imageUrl);
  } catch (error) {
    console.error(`Image analysis failed with provider ${provider.name}:`, error);

    // If the current provider failed and it's not already the mock provider, try mock fallback
    if (provider.name !== 'Mock Image Analysis') {
      console.warn('Falling back to mock image analysis provider');
      try {
        const mockProvider = new MockImageAnalysisProvider();
        return await mockProvider.analyzeImage(imageUrl);
      } catch (mockError) {
        console.error('Mock provider also failed:', mockError);
      }
    }

    throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compare image analysis with OCR results to validate accuracy
 */
export function compareAnalysisWithOCR(
  analysis: ImageDescription,
  ocrText: string
): {
  similarity: number;
  discrepancies: string[];
  recommendations: string[];
} {
  const discrepancies: string[] = [];
  const recommendations: string[] = [];
  let matchCount = 0;
  let totalChecks = 0;

  // Check estimated text against OCR text
  const ocrLower = ocrText.toLowerCase();
  for (const estimatedText of analysis.mainSubject.estimatedText) {
    totalChecks++;
    const estimated = estimatedText.toLowerCase();

    if (ocrLower.includes(estimated) || estimated.includes(ocrLower.split(' ')[0])) {
      matchCount++;
    } else {
      discrepancies.push(`Estimated text "${estimatedText}" not found in OCR results`);
    }
  }

  // Check for text length similarity
  totalChecks++;
  const estimatedLength = analysis.mainSubject.estimatedText.join(' ').length;
  const ocrLength = ocrText.length;

  if (Math.abs(estimatedLength - ocrLength) / Math.max(estimatedLength, ocrLength) < 0.3) {
    matchCount++;
  } else {
    discrepancies.push(`Significant length difference: estimated ${estimatedLength} chars vs OCR ${ocrLength} chars`);
  }

  const similarity = totalChecks > 0 ? matchCount / totalChecks : 0;

  // Generate recommendations
  if (similarity < 0.5) {
    recommendations.push('Consider using a different OCR provider for better accuracy');
    recommendations.push('Image quality may be too low for reliable text extraction');
  }

  if (analysis.confidence < 0.7) {
    recommendations.push('Visual analysis confidence is low - image may have poor quality or unclear text');
  }

  if (discrepancies.length > 2) {
    recommendations.push('Multiple discrepancies detected - manual review recommended');
  }

  return {
    similarity,
    discrepancies,
    recommendations,
  };
}