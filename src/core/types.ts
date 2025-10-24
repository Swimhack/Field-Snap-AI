/**
 * Field Snap AI - Core Types and Zod Schemas
 * 
 * This file contains all the TypeScript types and Zod validation schemas
 * used throughout the application. These schemas ensure type safety and
 * runtime validation, mirroring the database structure.
 */

import { z } from 'zod';

// =============================================================================
// UTILITY SCHEMAS
// =============================================================================

export const UUIDSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime();
export const URLSchema = z.string().refine((url) => {
  // Allow regular URLs and data URLs
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}, 'Invalid URL format');
export const PhoneSchema = z.string().regex(/^\+?[\d\s\-\(\)\.]+$/, 'Invalid phone number format');
export const EmailSchema = z.string().email();

// =============================================================================
// PROCESSING STATUS ENUMS
// =============================================================================

export const ProcessingStatusSchema = z.enum([
  'received',
  'processing', 
  'completed',
  'failed'
]);

export const QualificationStatusSchema = z.enum([
  'pending',
  'qualified',
  'unqualified', 
  'contacted',
  'converted'
]);

export const OutreachStatusSchema = z.enum([
  'not_sent',
  'scheduled',
  'sent',
  'responded',
  'bounced'
]);

export const UserRoleSchema = z.enum([
  'admin',
  'user',
  'viewer'
]);

export const LogLevelSchema = z.enum([
  'debug',
  'info', 
  'warn',
  'error',
  'fatal'
]);

export const NotificationPrioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'urgent'
]);

// =============================================================================
// LEAD SCHEMAS
// =============================================================================

// Social media data structure
export const SocialMediaSchema = z.object({
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  twitter: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  youtube: z.string().url().optional(),
});

// Reviews data structure
export const ReviewsSchema = z.object({
  google: z.object({
    rating: z.number().min(0).max(5).optional(),
    total_reviews: z.number().min(0).optional(),
    recent_reviews: z.array(z.object({
      text: z.string(),
      rating: z.number().min(1).max(5),
      date: z.string(),
      author: z.string().optional(),
    })).optional(),
  }).optional(),
  yelp: z.object({
    rating: z.number().min(0).max(5).optional(),
    total_reviews: z.number().min(0).optional(),
    url: z.string().url().optional(),
  }).optional(),
});

// Business hours structure
export const BusinessHoursSchema = z.object({
  monday: z.string().optional(),
  tuesday: z.string().optional(),
  wednesday: z.string().optional(),
  thursday: z.string().optional(),
  friday: z.string().optional(),
  saturday: z.string().optional(),
  sunday: z.string().optional(),
  timezone: z.string().default('UTC'),
});

// Additional contacts structure
export const AdditionalContactsSchema = z.object({
  secondary_phone: z.string().optional(),
  fax: z.string().optional(),
  emergency_contact: z.string().optional(),
  manager_email: z.string().email().optional(),
});

// Processing steps tracking
export const ProcessingStepsSchema = z.object({
  ocr_completed: z.boolean().default(false),
  enrichment_completed: z.boolean().default(false),
  scoring_completed: z.boolean().default(false),
  outreach_generated: z.boolean().default(false),
  ocr_started_at: TimestampSchema.optional(),
  ocr_completed_at: TimestampSchema.optional(),
  enrichment_started_at: TimestampSchema.optional(),
  enrichment_completed_at: TimestampSchema.optional(),
  scoring_started_at: TimestampSchema.optional(),
  scoring_completed_at: TimestampSchema.optional(),
});

// Main Lead schema
export const LeadSchema = z.object({
  id: UUIDSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  
  // Source information
  image_url: URLSchema,
  source_location: z.string().optional(),
  source_notes: z.string().optional(),
  
  // OCR extracted data
  business_name: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  services: z.array(z.string()).default([]),
  raw_ocr_text: z.string().optional(),
  
  // Enriched data
  social_media: SocialMediaSchema.default({}),
  reviews: ReviewsSchema.default({}),
  business_hours: BusinessHoursSchema.default({}),
  additional_contacts: AdditionalContactsSchema.default({}),
  
  // Scoring and qualification
  lead_score: z.number().min(0).max(100).default(0),
  qualification_status: QualificationStatusSchema.default('pending'),
  qualification_notes: z.string().optional(),
  
  // Outreach data
  preview_website_url: z.string().url().optional(),
  sms_draft: z.string().optional(),
  email_draft: z.string().optional(),
  outreach_status: OutreachStatusSchema.default('not_sent'),
  outreach_sent_at: TimestampSchema.optional(),
  
  // Processing status
  processing_status: ProcessingStatusSchema.default('received'),
  processing_error: z.string().optional(),
  processing_steps: ProcessingStepsSchema.default({}),
  
  // Logs and metadata
  logs: z.array(z.any()).default([]),
  metadata: z.record(z.any()).default({}),
});

// Schema for creating a new lead
export const CreateLeadSchema = LeadSchema.pick({
  image_url: true,
  source_location: true,
  source_notes: true,
});

// Schema for updating a lead
export const UpdateLeadSchema = LeadSchema.partial().omit({
  id: true,
  created_at: true,
});

// =============================================================================
// USER SCHEMAS
// =============================================================================

// Notification preferences structure
export const NotificationPreferencesSchema = z.object({
  email: z.object({
    enabled: z.boolean().default(true),
    types: z.array(z.string()).default(['lead_qualified', 'system_alerts', 'daily_summary']),
  }),
  sms: z.object({
    enabled: z.boolean().default(false),
    types: z.array(z.string()).default(['urgent_alerts']),
    phone: PhoneSchema.optional(),
  }),
  browser: z.object({
    enabled: z.boolean().default(true),
    types: z.array(z.string()).default(['lead_qualified', 'processing_complete']),
  }),
  sound: z.object({
    enabled: z.boolean().default(true),
  }),
  haptic: z.object({
    enabled: z.boolean().default(true),
  }),
});

// User schema
export const UserSchema = z.object({
  id: UUIDSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  
  email: EmailSchema,
  name: z.string().min(1).max(100),
  role: UserRoleSchema.default('user'),
  
  notification_preferences: NotificationPreferencesSchema.default({}),
  timezone: z.string().default('UTC'),
  is_active: z.boolean().default(true),
  last_login: TimestampSchema.optional(),
  
  metadata: z.record(z.any()).default({}),
});

// Schema for creating a new user
export const CreateUserSchema = UserSchema.pick({
  email: true,
  name: true,
  role: true,
  notification_preferences: true,
  timezone: true,
});

// =============================================================================
// NOTIFICATION SCHEMAS
// =============================================================================

export const NotificationSchema = z.object({
  id: UUIDSchema,
  created_at: TimestampSchema,
  
  user_id: UUIDSchema,
  type: z.string(),
  priority: NotificationPrioritySchema.default('normal'),
  
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  data: z.record(z.any()).default({}),
  
  // Delivery status
  email_sent: z.boolean().default(false),
  sms_sent: z.boolean().default(false),
  browser_sent: z.boolean().default(false),
  
  email_sent_at: TimestampSchema.optional(),
  sms_sent_at: TimestampSchema.optional(),
  browser_sent_at: TimestampSchema.optional(),
  
  // User interaction
  read_at: TimestampSchema.optional(),
  dismissed_at: TimestampSchema.optional(),
  
  // Related entity
  related_lead_id: UUIDSchema.optional(),
  
  metadata: z.record(z.any()).default({}),
});

// Schema for creating a notification
export const CreateNotificationSchema = NotificationSchema.pick({
  user_id: true,
  type: true,
  priority: true,
  title: true,
  message: true,
  data: true,
  related_lead_id: true,
});

// =============================================================================
// APPLICATION LOG SCHEMAS
// =============================================================================

export const AppLogSchema = z.object({
  id: UUIDSchema,
  created_at: TimestampSchema,
  
  level: LogLevelSchema,
  message: z.string().min(1),
  component: z.string().min(1),
  
  // Context data
  user_id: UUIDSchema.optional(),
  lead_id: UUIDSchema.optional(),
  request_id: z.string().optional(),
  session_id: z.string().optional(),
  
  // Technical details
  stack_trace: z.string().optional(),
  error_code: z.string().optional(),
  duration_ms: z.number().min(0).optional(),
  
  // Additional context
  data: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
});

// Schema for creating a log entry
export const CreateLogSchema = AppLogSchema.pick({
  level: true,
  message: true,
  component: true,
  user_id: true,
  lead_id: true,
  request_id: true,
  session_id: true,
  stack_trace: true,
  error_code: true,
  duration_ms: true,
  data: true,
  metadata: true,
});

// =============================================================================
// API REQUEST/RESPONSE SCHEMAS
// =============================================================================

// Ingest API request
export const IngestRequestSchema = z.object({
  imageUrl: URLSchema,
  sourceLocation: z.string().optional(),
  sourceNotes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Ingest API response
export const IngestResponseSchema = z.object({
  success: z.boolean(),
  leadId: UUIDSchema.optional(),
  message: z.string(),
  processingId: z.string().optional(),
  estimatedCompletionTime: z.number().optional(), // seconds
});

// OCR result schema
export const OCRResultSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1),
  boundingBoxes: z.array(z.object({
    text: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    confidence: z.number().min(0).max(1),
  })).optional(),
  detectedLanguage: z.string().optional(),
  processingTime: z.number().optional(),
  provider: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Lead scoring result schema
export const ScoringResultSchema = z.object({
  totalScore: z.number().min(0).max(100),
  breakdown: z.object({
    phoneNumber: z.number().default(0),
    email: z.number().default(0),
    website: z.number().default(0),
    socialMedia: z.number().default(0),
    businessHours: z.number().default(0),
    reviewsCount: z.number().default(0),
    reviewsRating: z.number().default(0),
  }),
  qualification: z.enum(['qualified', 'unqualified']),
  qualificationReason: z.string(),
});

// =============================================================================
// SYSTEM CONFIGURATION SCHEMAS
// =============================================================================

export const SystemConfigSchema = z.object({
  id: UUIDSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  
  key: z.string().min(1),
  value: z.any(),
  description: z.string().optional(),
  category: z.string().default('general'),
  
  is_public: z.boolean().default(false),
  requires_admin: z.boolean().default(true),
  
  metadata: z.record(z.any()).default({}),
});

// =============================================================================
// ERROR SCHEMAS
// =============================================================================

export const APIErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: TimestampSchema,
  requestId: z.string().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Export TypeScript types derived from Zod schemas
export type Lead = z.infer<typeof LeadSchema>;
export type CreateLead = z.infer<typeof CreateLeadSchema>;
export type UpdateLead = z.infer<typeof UpdateLeadSchema>;

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export type Notification = z.infer<typeof NotificationSchema>;
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;

export type AppLog = z.infer<typeof AppLogSchema>;
export type CreateLog = z.infer<typeof CreateLogSchema>;

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export type IngestRequest = z.infer<typeof IngestRequestSchema>;
export type IngestResponse = z.infer<typeof IngestResponseSchema>;

export type OCRResult = z.infer<typeof OCRResultSchema>;
export type ScoringResult = z.infer<typeof ScoringResultSchema>;

export type APIError = z.infer<typeof APIErrorSchema>;

// Processing status types
export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>;
export type QualificationStatus = z.infer<typeof QualificationStatusSchema>;
export type OutreachStatus = z.infer<typeof OutreachStatusSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type LogLevel = z.infer<typeof LogLevelSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

// Utility types
export type SocialMedia = z.infer<typeof SocialMediaSchema>;
export type Reviews = z.infer<typeof ReviewsSchema>;
export type BusinessHours = z.infer<typeof BusinessHoursSchema>;
export type AdditionalContacts = z.infer<typeof AdditionalContactsSchema>;
export type ProcessingSteps = z.infer<typeof ProcessingStepsSchema>;
