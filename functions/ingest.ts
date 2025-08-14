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
import { enrichment } from '../src/providers/enrich';
import { scoring } from '../src/providers/scoring';
import { notifications } from '../src/providers/notifications';
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
   * Step 2: OCR Processing
   */
  private async performOCR(lead: Lead): Promise<void> {
    this.logger.info('Starting OCR processing', { leadId: lead.id });
    
    try {
      const ocrResult = await this.logger.time(
        'OCR extraction',
        () => extractTextFromImage(lead.image_url),
        { leadId: lead.id }
      );

      // Parse extracted text for business information
      const parsedData = this.parseBusinessInfo(ocrResult.text);

      // Update lead with OCR results
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
      });

      this.logger.info('OCR processing completed', {
        leadId: lead.id,
        data: { confidence: ocrResult.confidence, textLength: ocrResult.text.length, businessName: parsedData.businessName },
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
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', message: 'Only POST requests are supported' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = IngestRequestSchema.parse(body);

    logger.info('Ingest request received', {
      data: { imageUrl: validatedRequest.imageUrl, sourceLocation: validatedRequest.sourceLocation },
    });

    // Create and run processing pipeline
    const pipeline = new LeadProcessingPipeline(requestId);
    
    // Start processing (async)
    const processingPromise = pipeline.processLead(
      validatedRequest.imageUrl,
      validatedRequest.sourceLocation,
      validatedRequest.sourceNotes
    );

    // For now, we'll wait for completion, but in production you might want to return immediately
    // and process in the background
    const processedLead = await processingPromise;

    const response = IngestResponseSchema.parse({
      success: true,
      leadId: processedLead.id,
      message: `Lead processing completed successfully. Lead ${processedLead.qualification_status} with score ${processedLead.lead_score}.`,
      processingId: requestId,
    });

    logger.info('Ingest request completed successfully', {
      data: { leadId: processedLead.id, score: processedLead.lead_score, status: processedLead.qualification_status },
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Ingest request failed', error as Error);

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
