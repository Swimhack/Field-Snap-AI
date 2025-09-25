/**
 * Field Snap AI - Main Ingest Function
 * 
 * This is the main HTTP entry point for the lead processing pipeline.
 * It handles image ingestion and orchestrates the complete workflow:
 * OCR → Enrichment → Scoring → Qualification → Outreach Generation
 */

import { IngestRequestSchema, IngestResponseSchema } from '../src/core/types';
import { db } from '../src/providers/db';
import { extractTextFromImage } from '../src/providers/ocr';
import { analyzeImage, compareAnalysisWithOCR } from '../src/providers/image-analysis';
import { enrichment } from '../src/providers/enrich';
import { scoring } from '../src/providers/scoring';
import { notifications } from '../src/providers/notifications';
import { searchBusinessInfo } from '../src/providers/websearch';
import { createLogger, generateRequestId, loggerMiddleware } from '../src/utils/logger';
import type { Lead, CreateLead } from '../src/core/types';

// =============================================================================
// PIPELINE ORCHESTRATION
// =============================================================================

export class LeadProcessingPipeline {
  private logger = createLogger('pipeline');
  private requestId: string;

  constructor(requestId?: string) {
    this.requestId = requestId || generateRequestId();
    this.logger = createLogger('pipeline', this.requestId);
  }

  /**
   * Process a new lead through the complete pipeline
   */
  async processLead(imageUrl: string, sourceLocation?: string, sourceNotes?: string): Promise<Lead> {
    const startTime = Date.now();
    
    // Step 1: Create initial lead record
    const lead = await this.createInitialLead(imageUrl, sourceLocation, sourceNotes);
    
    try {
      // Step 2: OCR Processing
      await this.performOCR(lead);
      
      // Step 3: Data Enrichment
      await this.performEnrichment(lead);
      
      // Step 4: Lead Scoring & Qualification
      await this.performScoring(lead);
      
      // Step 5: Generate Outreach Materials
      await this.generateOutreach(lead);
      
      // Step 6: Send Notifications
      await this.sendNotifications(lead);
      
      // Mark as completed
      const completedLead = await this.markCompleted(lead);
      
      const totalTime = Date.now() - startTime;
      this.logger.info('Lead processing completed successfully', {
        leadId: lead.id,
        duration: totalTime,
        data: { finalScore: completedLead.lead_score, status: completedLead.qualification_status },
      });
      
      return completedLead;
      
    } catch (error) {
      await this.markFailed(lead, error as Error);
      throw error;
    }
  }

  /**
   * Step 1: Create initial lead record
   */
  private async createInitialLead(imageUrl: string, sourceLocation?: string, sourceNotes?: string): Promise<Lead> {
    this.logger.info('Creating initial lead record', { data: { imageUrl, sourceLocation } });
    
    const leadData: CreateLead = {
      image_url: imageUrl,
      source_location: sourceLocation,
      source_notes: sourceNotes,
    };

    const lead = await db.createLead(leadData);
    
    // Update processing status
    await db.updateLead(lead.id, {
      processing_status: 'processing',
      processing_steps: {
        ocr_completed: false,
        enrichment_completed: false,
        scoring_completed: false,
        outreach_generated: false,
        ocr_started_at: new Date().toISOString(),
      },
    });

    this.logger.info('Initial lead record created', { leadId: lead.id });
    return lead;
  }

  /**
   * Step 2: Enhanced Image Analysis and OCR Processing
   */
  private async performOCR(lead: Lead): Promise<void> {
    this.logger.info('🔍 OCR START: Starting enhanced image analysis and OCR processing', {
      leadId: lead.id,
      imageUrl: lead.image_url.substring(0, 50) + '...',
      imageType: lead.image_url.startsWith('data:') ? 'base64' : 'url'
    });

    try {
      // Step 2a: Enhanced Image Analysis (as specified)
      this.logger.info('🖼️ IMAGE ANALYSIS: Starting enhanced visual analysis', { leadId: lead.id });

      let imageAnalysis;
      try {
        imageAnalysis = await this.logger.time(
          'Image analysis',
          () => analyzeImage(lead.image_url),
          { leadId: lead.id }
        );

        this.logger.info('✅ IMAGE ANALYSIS: Enhanced visual analysis completed', {
          leadId: lead.id,
          shape: imageAnalysis.mainSubject.shape,
          colors: imageAnalysis.mainSubject.colors,
          estimatedTextLines: imageAnalysis.mainSubject.estimatedText,
          layout: imageAnalysis.mainSubject.layout,
          confidence: imageAnalysis.confidence,
          processingTime: imageAnalysis.processingTime
        });
      } catch (analysisError) {
        this.logger.error('❌ IMAGE ANALYSIS ERROR: Enhanced visual analysis failed', {
          leadId: lead.id,
          error: analysisError instanceof Error ? analysisError.message : String(analysisError),
          stack: analysisError instanceof Error ? analysisError.stack : undefined
        });
        throw new Error(`Image analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
      }

      // Step 2b: OCR Processing
      this.logger.info('📝 OCR: Starting text extraction from image', { leadId: lead.id });

      let ocrResult;
      try {
        ocrResult = await this.logger.time(
          'OCR extraction',
          () => extractTextFromImage(lead.image_url),
          { leadId: lead.id }
        );

        this.logger.info('✅ OCR: Text extraction completed', {
          leadId: lead.id,
          textLength: ocrResult.text.length,
          confidence: ocrResult.confidence,
          provider: ocrResult.provider || 'unknown',
          extractedText: ocrResult.text.substring(0, 200) + (ocrResult.text.length > 200 ? '...' : '')
        });
      } catch (ocrError) {
        this.logger.error('❌ OCR ERROR: Text extraction failed', {
          leadId: lead.id,
          error: ocrError instanceof Error ? ocrError.message : String(ocrError),
          stack: ocrError instanceof Error ? ocrError.stack : undefined
        });
        throw new Error(`OCR processing failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
      }

      // Step 2c: Compare Image Analysis with OCR Results
      this.logger.info('🔍 COMPARISON: Comparing image analysis with OCR results', { leadId: lead.id });

      let comparison;
      try {
        comparison = compareAnalysisWithOCR(imageAnalysis, ocrResult.text);

        this.logger.info('✅ COMPARISON: Analysis vs OCR comparison completed', {
          leadId: lead.id,
          similarity: comparison.similarity,
          discrepancyCount: comparison.discrepancies.length,
          recommendationCount: comparison.recommendations.length,
          discrepancies: comparison.discrepancies,
          recommendations: comparison.recommendations
        });

        if (comparison.similarity < 0.5) {
          this.logger.warn('⚠️ QUALITY WARNING: Low similarity between image analysis and OCR results', {
            leadId: lead.id,
            similarity: comparison.similarity,
            discrepancies: comparison.discrepancies,
            recommendations: comparison.recommendations
          });
        }
      } catch (comparisonError) {
        this.logger.error('❌ COMPARISON ERROR: Failed to compare analysis with OCR', {
          leadId: lead.id,
          error: comparisonError instanceof Error ? comparisonError.message : String(comparisonError)
        });
        // Don't throw here, just continue with degraded functionality
        comparison = { similarity: 0, discrepancies: ['Comparison failed'], recommendations: ['Manual review recommended'] };
      }

      // Enhanced parsing: Combine OCR results with intelligent subject analysis
      this.logger.info('📊 ENHANCED PARSING: Combining OCR with intelligent subject analysis', { leadId: lead.id });

      let parsedData;
      try {
        // Extract from OCR text
        const ocrParsedData = this.parseBusinessInfo(ocrResult.text);
        
        // Extract from image analysis business subjects
        const analysisData = this.extractBusinessDataFromImageAnalysis(imageAnalysis);
        
        // Merge and prioritize the data sources
        parsedData = this.mergeBusinessData(ocrParsedData, analysisData);

        this.logger.info('✅ ENHANCED PARSING: Business information extracted and merged', {
          leadId: lead.id,
          businessName: parsedData.businessName,
          hasPhone: !!parsedData.phoneNumber,
          hasEmail: !!parsedData.email,
          hasWebsite: !!parsedData.website,
          hasAddress: !!parsedData.address,
          servicesCount: parsedData.services?.length || 0,
          dataSourceMetrics: {
            ocrExtractions: Object.values(ocrParsedData).filter(v => v).length,
            imageAnalysisExtractions: Object.values(analysisData).filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length,
            subjectIsolationSuccess: imageAnalysis.subjectAnalysis?.subjectIsolationSuccess,
            businessRelevanceScore: imageAnalysis.subjectAnalysis?.businessRelevanceScore
          }
        });
      } catch (parseError) {
        this.logger.error('❌ ENHANCED PARSING ERROR: Failed to parse business information', {
          leadId: lead.id,
          error: parseError instanceof Error ? parseError.message : String(parseError),
          text: ocrResult.text.substring(0, 200) + '...',
          hasImageAnalysis: !!imageAnalysis.subjectAnalysis
        });
        // Fallback to basic OCR parsing
        try {
          parsedData = this.parseBusinessInfo(ocrResult.text);
        } catch (fallbackError) {
          // Set default values for complete parsing failure
          parsedData = {
            businessName: null,
            phoneNumber: null,
            email: null,
            website: null,
            address: null,
            services: []
          };
        }
      }

      // Update lead with OCR results and image analysis
      await db.updateLead(lead.id, {
        raw_ocr_text: ocrResult.text,
        business_name: parsedData.businessName,
        phone_number: parsedData.phoneNumber,
        email: parsedData.email,
        website: parsedData.website,
        address: parsedData.address,
        services: parsedData.services,
        processing_steps: {
          ...lead.processing_steps,
          ocr_completed: true,
          ocr_completed_at: new Date().toISOString(),
          enrichment_started_at: new Date().toISOString(),
        },
        // Store comprehensive image analysis results including subject analysis
        source_notes: `${lead.source_notes || ''}\n\nENHANCED IMAGE ANALYSIS:\nShape: ${imageAnalysis.mainSubject.shape}\nColors: ${imageAnalysis.mainSubject.colors.join(', ')}\nEstimated Text: ${imageAnalysis.mainSubject.estimatedText.join(' | ')}\nLayout: ${imageAnalysis.mainSubject.layout}\nConfidence: ${imageAnalysis.confidence}\nSimilarity to OCR: ${comparison.similarity}\n\nSUBJECT ANALYSIS:\nPrimary Subject: ${imageAnalysis.subjectAnalysis?.primaryBusinessSubject?.type || 'unknown'}\nSubject Description: ${imageAnalysis.subjectAnalysis?.primaryBusinessSubject?.description || 'N/A'}\nBusiness Relevance Score: ${imageAnalysis.subjectAnalysis?.businessRelevanceScore || 0}\nSubject Isolation Success: ${imageAnalysis.subjectAnalysis?.subjectIsolationSuccess || false}\nDetected Subjects: ${imageAnalysis.subjectAnalysis?.detectedSubjects?.length || 0}\nOther Objects: ${imageAnalysis.subjectAnalysis?.otherObjects?.join(', ') || 'none detected'}\n\nVISUAL DESCRIPTION:\n${imageAnalysis.visualDescription}`.trim(),
      });

      this.logger.info('Enhanced OCR processing completed', {
        leadId: lead.id,
        data: {
          ocrConfidence: ocrResult.confidence,
          textLength: ocrResult.text.length,
          businessName: parsedData.businessName,
          imageAnalysisConfidence: imageAnalysis.confidence,
          analysisOcrSimilarity: comparison.similarity,
          shape: imageAnalysis.mainSubject.shape,
          colorsFound: imageAnalysis.mainSubject.colors.length
        },
      });

    } catch (error) {
      this.logger.error('OCR processing failed', error as Error, { leadId: lead.id });
      throw new Error(`OCR processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Step 3: Data Enrichment
   */
  private async performEnrichment(lead: Lead): Promise<void> {
    this.logger.info('Starting data enrichment', { leadId: lead.id });

    try {
      // Get the updated lead data
      const updatedLead = await db.getLeadById(lead.id);
      if (!updatedLead) throw new Error('Lead not found');

      if (updatedLead.business_name) {
        const enrichmentResult = await this.logger.time(
          'Business enrichment',
          () => enrichment.enrichBusiness(
            updatedLead.business_name!,
            updatedLead.phone_number,
            updatedLead.address
          ),
          { leadId: lead.id }
        );

        // If missing critical information, perform web search
        if (!updatedLead.website || !updatedLead.email || !updatedLead.phone_number) {
          this.logger.info('Performing web search for missing information', { leadId: lead.id });

          const webSearchResult = await searchBusinessInfo(
            updatedLead.business_name,
            updatedLead.address || updatedLead.source_location,
            {
              phoneNumber: updatedLead.phone_number,
              email: updatedLead.email,
              website: updatedLead.website,
              address: updatedLead.address
            }
          );

          // Merge web search results
          enrichmentResult.website = enrichmentResult.website || webSearchResult.website;
          enrichmentResult.socialMedia = { ...enrichmentResult.socialMedia, ...webSearchResult.socialMedia };
          enrichmentResult.businessHours = enrichmentResult.businessHours || webSearchResult.businessHours;
          enrichmentResult.reviews = enrichmentResult.reviews || (webSearchResult.reviews && typeof webSearchResult.reviews === 'object' && 'google' in webSearchResult.reviews ? webSearchResult.reviews : {});

          // Update lead with web search results
          if (!updatedLead.phone_number && webSearchResult.phoneNumber) {
            await db.updateLead(lead.id, { phone_number: webSearchResult.phoneNumber });
          }
          if (!updatedLead.email && webSearchResult.email) {
            await db.updateLead(lead.id, { email: webSearchResult.email });
          }
        }

        // Update lead with enriched data
        await db.updateLead(lead.id, {
          social_media: enrichmentResult.socialMedia || {},
          reviews: enrichmentResult.reviews || {},
          business_hours: enrichmentResult.businessHours || {},
          website: enrichmentResult.website || updatedLead.website,
          processing_steps: {
            ...updatedLead.processing_steps,
            enrichment_completed: true,
            enrichment_completed_at: new Date().toISOString(),
            scoring_started_at: new Date().toISOString(),
          },
        });

        this.logger.info('Data enrichment completed', {
          leadId: lead.id,
          data: { confidence: enrichmentResult.confidence },
        });
      } else {
        this.logger.warn('Skipping enrichment - no business name found', { leadId: lead.id });

        await db.updateLead(lead.id, {
          processing_steps: {
            ...lead.processing_steps,
            enrichment_completed: true,
            enrichment_completed_at: new Date().toISOString(),
            scoring_started_at: new Date().toISOString(),
          },
        });
      }

    } catch (error) {
      this.logger.error('Data enrichment failed', error as Error, { leadId: lead.id });
      // Don't fail the entire pipeline for enrichment failures
      this.logger.warn('Continuing without enrichment data', { leadId: lead.id });
    }
  }

  /**
   * Step 4: Lead Scoring & Qualification
   */
  private async performScoring(lead: Lead): Promise<void> {
    this.logger.info('Starting lead scoring', { leadId: lead.id });
    
    try {
      // Get the updated lead data
      const updatedLead = await db.getLeadById(lead.id);
      if (!updatedLead) throw new Error('Lead not found');

      const scoringResult = await this.logger.time(
        'Lead scoring',
        () => scoring.scoreLead(updatedLead),
        { leadId: lead.id }
      );

      // Update lead with scoring results
      await db.updateLead(lead.id, {
        lead_score: scoringResult.totalScore,
        qualification_status: scoringResult.qualification,
        qualification_notes: scoringResult.qualificationReason,
        processing_steps: {
          ...updatedLead.processing_steps,
          scoring_completed: true,
          scoring_completed_at: new Date().toISOString(),
        },
      });

      this.logger.info('Lead scoring completed', {
        leadId: lead.id,
        data: { 
          score: scoringResult.totalScore, 
          qualification: scoringResult.qualification,
          breakdown: scoringResult.breakdown,
        },
      });

    } catch (error) {
      this.logger.error('Lead scoring failed', error as Error, { leadId: lead.id });
      throw new Error(`Lead scoring failed: ${(error as Error).message}`);
    }
  }

  /**
   * Step 5: Generate Outreach Materials
   */
  private async generateOutreach(lead: Lead): Promise<void> {
    this.logger.info('Generating outreach materials', { leadId: lead.id });
    
    try {
      // Get the updated lead data
      const updatedLead = await db.getLeadById(lead.id);
      if (!updatedLead) throw new Error('Lead not found');

      // Only generate outreach for qualified leads
      if (updatedLead.qualification_status === 'qualified') {
        const outreachData = await this.generateOutreachContent(updatedLead);

        await db.updateLead(lead.id, {
          sms_draft: outreachData.smsDraft,
          email_draft: outreachData.emailDraft,
          preview_website_url: outreachData.previewWebsiteUrl,
          processing_steps: {
            ...updatedLead.processing_steps,
            outreach_generated: true,
          },
        });

        this.logger.info('Outreach materials generated', { leadId: lead.id });
      } else {
        this.logger.info('Skipping outreach generation for unqualified lead', { leadId: lead.id });
        
        await db.updateLead(lead.id, {
          processing_steps: {
            ...updatedLead.processing_steps,
            outreach_generated: false,
          },
        });
      }

    } catch (error) {
      this.logger.error('Outreach generation failed', error as Error, { leadId: lead.id });
      // Don't fail the entire pipeline for outreach generation failures
      this.logger.warn('Continuing without outreach materials', { leadId: lead.id });
    }
  }

  /**
   * Step 6: Send Notifications
   */
  private async sendNotifications(lead: Lead): Promise<void> {
    this.logger.info('Sending notifications', { leadId: lead.id });
    
    try {
      // Get the final lead data
      const finalLead = await db.getLeadById(lead.id);
      if (!finalLead) throw new Error('Lead not found');

      // Send notifications based on qualification status
      if (finalLead.qualification_status === 'qualified') {
        await notifications.sendSystemNotification({
          type: 'lead_qualified',
          priority: finalLead.lead_score >= 80 ? 'high' : 'normal',
          title: `New Qualified Lead: ${finalLead.business_name || 'Unknown Business'}`,
          message: `A new lead has been qualified with a score of ${finalLead.lead_score}. Business: ${finalLead.business_name || 'Unknown'}, Phone: ${finalLead.phone_number || 'Not provided'}.`,
          data: {
            leadId: finalLead.id,
            businessName: finalLead.business_name,
            leadScore: finalLead.lead_score,
            phoneNumber: finalLead.phone_number,
            email: finalLead.email,
          },
          relatedLeadId: finalLead.id,
        });
      }

      // Always send processing completion notification
      await notifications.sendSystemNotification({
        type: 'processing_complete',
        priority: 'low',
        title: 'Lead Processing Complete',
        message: `Lead processing completed for ${finalLead.business_name || 'business'}. Status: ${finalLead.qualification_status}, Score: ${finalLead.lead_score}.`,
        data: {
          leadId: finalLead.id,
          businessName: finalLead.business_name,
          leadScore: finalLead.lead_score,
          qualificationStatus: finalLead.qualification_status,
        },
        relatedLeadId: finalLead.id,
      });

      this.logger.info('Notifications sent', { leadId: lead.id });

    } catch (error) {
      this.logger.error('Notification sending failed', error as Error, { leadId: lead.id });
      // Don't fail the entire pipeline for notification failures
    }
  }

  /**
   * Mark lead processing as completed
   */
  private async markCompleted(lead: Lead): Promise<Lead> {
    const completedLead = await db.updateLead(lead.id, {
      processing_status: 'completed',
    });

    this.logger.info('Lead marked as completed', { leadId: lead.id });
    return completedLead;
  }

  /**
   * Mark lead processing as failed
   */
  private async markFailed(lead: Lead, error: Error): Promise<void> {
    await db.updateLead(lead.id, {
      processing_status: 'failed',
      processing_error: error.message,
    });

    this.logger.error('Lead marked as failed', error, { leadId: lead.id });

    // Send failure notification
    try {
      await notifications.sendSystemNotification({
        type: 'processing_failed',
        priority: 'high',
        title: 'Lead Processing Failed',
        message: `Failed to process lead for ${lead.business_name || 'unknown business'}. Error: ${error.message}`,
        data: {
          leadId: lead.id,
          error: error.message,
          imageUrl: lead.image_url,
        },
        relatedLeadId: lead.id,
      });
    } catch (notificationError) {
      this.logger.error('Failed to send failure notification', notificationError as Error, { leadId: lead.id });
    }
  }

  /**
   * Parse business information from OCR text
   */
  private parseBusinessInfo(text: string): {
    businessName?: string;
    phoneNumber?: string;
    email?: string;
    website?: string;
    address?: string;
    services: string[];
  } {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Phone number regex
    const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
    const phoneMatch = text.match(phoneRegex);
    
    // Email regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = text.match(emailRegex);
    
    // Website regex
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/;
    const websiteMatch = text.match(websiteRegex);
    
    // Business name is often the first or second line
    const businessName = lines.length > 0 ? lines[0] : undefined;
    
    // Services keywords
    const serviceKeywords = [
      'plumbing', 'electrical', 'hvac', 'landscaping', 'cleaning', 'roofing',
      'painting', 'construction', 'repair', 'maintenance', 'installation',
      'service', 'emergency', 'licensed', 'insured', 'free estimate'
    ];
    
    const services = lines.filter(line => 
      serviceKeywords.some(keyword => 
        line.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    return {
      businessName: businessName,
      phoneNumber: phoneMatch ? phoneMatch[0] : undefined,
      email: emailMatch ? emailMatch[0] : undefined,
      website: websiteMatch ? (websiteMatch[0].startsWith('http') ? websiteMatch[0] : `https://${websiteMatch[0]}`) : undefined,
      address: this.extractAddress(lines),
      services: services.slice(0, 5), // Limit to 5 services
    };
  }

  /**
   * Extract address from OCR text lines
   */
  private extractAddress(lines: string[]): string | undefined {
    // Look for address patterns (simplified)
    const addressPatterns = [
      /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)/i,
      /\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}/i,
    ];

    for (const line of lines) {
      for (const pattern of addressPatterns) {
        if (pattern.test(line)) {
          return line;
        }
      }
    }

    return undefined;
  }

  /**
   * Generate outreach content for qualified leads
   */
  private async generateOutreachContent(lead: Lead): Promise<{
    smsDraft: string;
    emailDraft: string;
    previewWebsiteUrl?: string;
  }> {
    const businessName = lead.business_name || 'your business';
    const services = lead.services.length > 0 ? lead.services.join(', ') : 'your services';

    const smsDraft = `Hi! I came across ${businessName} and was impressed by your ${services}. I'd love to discuss how we can help you reach more customers online. Are you available for a quick 5-minute call this week? - Field Snap AI`;

    const emailDraft = `Subject: Digital Marketing Opportunity for ${businessName}

Hi there,

I recently discovered ${businessName} and was impressed by your ${services}. Your business caught my attention, and I believe we could help you significantly expand your online presence and customer reach.

We specialize in helping local businesses like yours:
• Increase online visibility
• Generate more qualified leads
• Improve customer engagement
• Boost revenue through digital marketing

Based on your current setup, I see some great opportunities to enhance your digital footprint. Would you be interested in a brief 15-minute conversation to explore how we can help ${businessName} grow?

I'm available for a call this week at your convenience.

Best regards,
Field Snap AI Team

P.S. This is a genuine opportunity - we've helped similar businesses increase their leads by 40% on average.`;

    return {
      smsDraft,
      emailDraft,
      // TODO: Generate preview website URL
      previewWebsiteUrl: undefined,
    };
  }

  /**
   * Extract business data from intelligent image analysis
   */
  private extractBusinessDataFromImageAnalysis(imageAnalysis: any): {
    businessName?: string;
    phoneNumber?: string;
    email?: string;
    website?: string;
    address?: string;
    services: string[];
  } {
    // Get the primary business subject from image analysis
    const primarySubject = imageAnalysis.subjectAnalysis?.primaryBusinessSubject;
    
    if (!primarySubject || !primarySubject.businessData) {
      return { services: [] };
    }

    const businessData = primarySubject.businessData;
    
    return {
      businessName: businessData.businessName || undefined,
      phoneNumber: businessData.phoneNumber || undefined,
      email: businessData.email || undefined,
      website: businessData.website || undefined,
      address: businessData.address || undefined,
      services: businessData.services || [],
    };
  }

  /**
   * Merge business data from multiple sources, prioritizing the most reliable data
   */
  private mergeBusinessData(
    ocrData: any,
    imageAnalysisData: any
  ): {
    businessName?: string;
    phoneNumber?: string;
    email?: string;
    website?: string;
    address?: string;
    services: string[];
  } {
    // Priority: Image analysis for business name and services (more context-aware)
    // OCR for precise contact details (better at exact text extraction)
    
    return {
      // Prioritize image analysis for business name (better context understanding)
      businessName: imageAnalysisData.businessName || ocrData.businessName || undefined,
      
      // Prioritize OCR for contact details (better precision)
      phoneNumber: ocrData.phoneNumber || imageAnalysisData.phoneNumber || undefined,
      email: ocrData.email || imageAnalysisData.email || undefined,
      website: ocrData.website || imageAnalysisData.website || undefined,
      address: ocrData.address || imageAnalysisData.address || undefined,
      
      // Combine services from both sources
      services: [
        ...(imageAnalysisData.services || []),
        ...(ocrData.services || [])
      ].filter((service, index, array) => 
        // Remove duplicates (case-insensitive)
        array.findIndex(s => s.toLowerCase() === service.toLowerCase()) === index
      ).slice(0, 10) // Limit to 10 services
    };
  }
}

// =============================================================================
// HTTP HANDLER
// =============================================================================

/**
 * Main HTTP handler for the ingest endpoint
 */
export async function handler(request: Request): Promise<Response> {
  const requestId = generateRequestId();
  const logger = createLogger('ingest', requestId);
  const startTime = Date.now();

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  logger.info('🖼️ IMAGE UPLOAD: New ingest request started', {
    requestId,
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin'),
    contentType: request.headers.get('content-type')
  });

  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    logger.info('🔀 CORS: OPTIONS request handled', { requestId });
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    logger.error('❌ METHOD ERROR: Invalid HTTP method', {
      requestId,
      method: request.method,
      expected: 'POST'
    });
    return new Response(
      JSON.stringify({ error: 'Method not allowed', message: 'Only POST requests are supported' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse and validate request body
    logger.info('📋 PARSING: Reading request body', { requestId });

    let body;
    try {
      body = await request.json();

      const imageInfo = body.imageUrl ? {
        isDataUrl: body.imageUrl.startsWith('data:'),
        urlLength: body.imageUrl.length,
        mimeType: body.imageUrl.startsWith('data:') ? body.imageUrl.split(';')[0].split(':')[1] : 'unknown'
      } : null;

      logger.info('✅ PARSING: Request body parsed successfully', {
        requestId,
        hasImageUrl: !!body.imageUrl,
        imageInfo,
        sourceLocation: body.sourceLocation,
        sourceNotes: body.sourceNotes,
        metadata: body.metadata
      });
    } catch (parseError) {
      logger.error('❌ PARSING ERROR: Failed to parse JSON request body', {
        requestId,
        error: parseError instanceof Error ? parseError.message : String(parseError),
        stack: parseError instanceof Error ? parseError.stack : undefined,
        contentType: request.headers.get('content-type')
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'JSON_PARSE_ERROR',
          message: 'Failed to parse request body as JSON',
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('🔍 VALIDATION: Validating request schema', { requestId });

    let validatedRequest;
    try {
      validatedRequest = IngestRequestSchema.parse(body);

      logger.info('✅ VALIDATION: Request schema validated successfully', {
        requestId,
        imageUrl: validatedRequest.imageUrl.substring(0, 50) + '...',
        sourceLocation: validatedRequest.sourceLocation,
        validationSuccess: true
      });
    } catch (validationError) {
      logger.error('❌ VALIDATION ERROR: Schema validation failed', {
        requestId,
        error: validationError instanceof Error ? validationError.message : String(validationError),
        receivedKeys: Object.keys(body),
        imageUrlType: body.imageUrl ? typeof body.imageUrl : 'undefined',
        imageUrlValid: body.imageUrl ? (body.imageUrl.startsWith('http') || body.imageUrl.startsWith('data:')) : false
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'VALIDATION_ERROR',
          message: validationError instanceof Error ? validationError.message : 'Schema validation failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('🚀 PROCESSING: Starting lead processing pipeline', {
      requestId,
      imageUrl: validatedRequest.imageUrl.substring(0, 50) + '...',
      sourceLocation: validatedRequest.sourceLocation,
    });

    // Create and run processing pipeline
    const pipeline = new LeadProcessingPipeline(requestId);

    let processedLead;
    try {
      logger.info('⚙️ PIPELINE: Starting image processing pipeline', { requestId });

      // Start processing (async)
      const processingPromise = pipeline.processLead(
        validatedRequest.imageUrl,
        validatedRequest.sourceLocation,
        validatedRequest.sourceNotes
      );

      // For now, we'll wait for completion, but in production you might want to return immediately
      // and process in the background
      processedLead = await processingPromise;

      logger.info('✅ PIPELINE: Processing pipeline completed successfully', {
        requestId,
        leadId: processedLead.id,
        score: processedLead.lead_score,
        status: processedLead.qualification_status,
        processingTime: Date.now() - startTime
      });

    } catch (processingError) {
      logger.error('❌ PIPELINE ERROR: Lead processing pipeline failed', {
        requestId,
        error: processingError instanceof Error ? processingError.message : String(processingError),
        stack: processingError instanceof Error ? processingError.stack : undefined,
        processingTime: Date.now() - startTime,
        stage: 'pipeline_execution'
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'PROCESSING_ERROR',
          message: processingError instanceof Error ? processingError.message : 'Lead processing failed',
          processingId: requestId
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = IngestResponseSchema.parse({
      success: true,
      leadId: processedLead.id,
      message: `Lead processing completed successfully. Lead ${processedLead.qualification_status} with score ${processedLead.lead_score}.`,
      processingId: requestId,
    });

    logger.info('🎉 SUCCESS: Ingest request completed successfully', {
      requestId,
      leadId: processedLead.id,
      score: processedLead.lead_score,
      status: processedLead.qualification_status,
      totalTime: Date.now() - startTime
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('❌ FATAL ERROR: Ingest request failed with unhandled error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      totalTime: Date.now() - startTime,
      stage: 'handler_execution'
    });

    const errorResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      error: error instanceof Error ? error.name : 'UnknownError',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// =============================================================================
// DEVELOPMENT SERVER
// =============================================================================

// Simple HTTP server for development
if (import.meta.main) {
  const port = parseInt(process.env.PORT || '3001');
  
  console.log(`🚀 Field Snap AI Ingest Server starting on port ${port}`);
  console.log(`📍 Endpoint: http://localhost:${port}/`);
  console.log(`📖 Send POST requests with: { "imageUrl": "https://example.com/image.jpg" }`);
  
  Bun.serve({
    port,
    async fetch(request) {
      // Add request logging middleware
      const requestId = generateRequestId();
      const logger = createLogger('server', requestId);
      
      logger.info(`${request.method} ${new URL(request.url).pathname}`, {
        data: { userAgent: request.headers.get('User-Agent') },
      });

      return handler(request);
    },
  });
}
