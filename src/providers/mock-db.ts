/**
 * Field Snap AI - Mock Database Provider
 *
 * This module provides a mock database for testing image analysis functionality
 * without requiring full Supabase configuration.
 */

import type {
  Lead,
  CreateLead,
  UpdateLead,
  User,
  CreateUser,
  Notification,
  CreateNotification,
  AppLog,
  CreateLog,
  SystemConfig,
  LogLevel,
  ProcessingStatus,
  QualificationStatus,
} from '@/core/types';

// =============================================================================
// MOCK DATABASE PROVIDER
// =============================================================================

class MockDatabaseProvider {
  private leads: Map<string, Lead> = new Map();
  private users: Map<string, User> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private logs: Map<string, AppLog> = new Map();
  private static instance: MockDatabaseProvider;

  static getInstance(): MockDatabaseProvider {
    if (!MockDatabaseProvider.instance) {
      MockDatabaseProvider.instance = new MockDatabaseProvider();
    }
    return MockDatabaseProvider.instance;
  }

  // =============================================================================
  // LEAD OPERATIONS
  // =============================================================================

  async createLead(leadData: CreateLead): Promise<Lead> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const lead: Lead = {
      id,
      image_url: leadData.image_url,
      source_location: leadData.source_location || undefined,
      source_notes: leadData.source_notes || undefined,
      processing_status: 'received' as ProcessingStatus,
      business_name: undefined,
      phone_number: undefined,
      email: undefined,
      website: undefined,
      address: undefined,
      services: [],
      social_media: {},
      reviews: {},
      business_hours: {},
      additional_contacts: {},
      raw_ocr_text: undefined,
      lead_score: 0,
      qualification_status: 'pending' as QualificationStatus,
      qualification_notes: undefined,
      sms_draft: undefined,
      email_draft: undefined,
      preview_website_url: undefined,
      outreach_status: 'not_sent',
      outreach_sent_at: undefined,
      processing_steps: {
        ocr_completed: false,
        enrichment_completed: false,
        scoring_completed: false,
        outreach_generated: false,
      },
      processing_error: undefined,
      logs: [],
      metadata: {},
      created_at: now,
      updated_at: now,
    };

    this.leads.set(id, lead);
    console.log(`[MockDB] Created lead: ${id}`);
    return lead;
  }

  async getLeadById(id: string): Promise<Lead | null> {
    const lead = this.leads.get(id);
    console.log(`[MockDB] Get lead: ${id}, found: ${!!lead}`);
    return lead || null;
  }

  async updateLead(id: string, updates: UpdateLead): Promise<Lead> {
    const existingLead = this.leads.get(id);
    if (!existingLead) {
      throw new Error(`Lead with ID ${id} not found`);
    }

    const updatedLead: Lead = {
      ...existingLead,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.leads.set(id, updatedLead);
    console.log(`[MockDB] Updated lead: ${id}`);
    return updatedLead;
  }

  async getAllLeads(): Promise<Lead[]> {
    const leads = Array.from(this.leads.values());
    console.log(`[MockDB] Get all leads: ${leads.length} leads`);
    return leads;
  }

  async getLeadsByStatus(status: ProcessingStatus): Promise<Lead[]> {
    const leads = Array.from(this.leads.values()).filter(
      lead => lead.processing_status === status
    );
    console.log(`[MockDB] Get leads by status ${status}: ${leads.length} leads`);
    return leads;
  }

  async deleteLead(id: string): Promise<boolean> {
    const deleted = this.leads.delete(id);
    console.log(`[MockDB] Delete lead: ${id}, success: ${deleted}`);
    return deleted;
  }

  // =============================================================================
  // USER OPERATIONS
  // =============================================================================

  async createUser(userData: CreateUser): Promise<User> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const user: User = {
      id,
      email: userData.email,
      name: userData.name || null,
      role: userData.role || 'user',
      preferences: userData.preferences || {},
      created_at: now,
      updated_at: now,
    };

    this.users.set(id, user);
    console.log(`[MockDB] Created user: ${id}`);
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    console.log(`[MockDB] Get user: ${id}, found: ${!!user}`);
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    console.log(`[MockDB] Get user by email: ${email}, found: ${!!user}`);
    return user || null;
  }

  // =============================================================================
  // NOTIFICATION OPERATIONS
  // =============================================================================

  async createNotification(notificationData: CreateNotification): Promise<Notification> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const notification: Notification = {
      id,
      type: notificationData.type,
      priority: notificationData.priority || 'normal',
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {},
      related_lead_id: notificationData.related_lead_id || null,
      read: false,
      sent_at: null,
      created_at: now,
      updated_at: now,
    };

    this.notifications.set(id, notification);
    console.log(`[MockDB] Created notification: ${id}`);
    return notification;
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values()).filter(n => !n.read);
    console.log(`[MockDB] Get unread notifications: ${notifications.length}`);
    return notifications;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    notification.read = true;
    notification.updated_at = new Date().toISOString();
    this.notifications.set(id, notification);
    console.log(`[MockDB] Marked notification as read: ${id}`);
    return true;
  }

  // =============================================================================
  // LOG OPERATIONS
  // =============================================================================

  async createLog(logData: CreateLog): Promise<AppLog> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const log: AppLog = {
      id,
      level: logData.level,
      message: logData.message,
      context: logData.context || {},
      component: logData.component || null,
      request_id: logData.request_id || null,
      related_lead_id: logData.related_lead_id || null,
      created_at: now,
    };

    this.logs.set(id, log);
    console.log(`[MockDB] Created log: ${id}`);
    return log;
  }

  async getLogs(
    limit: number = 100,
    level?: LogLevel,
    component?: string
  ): Promise<AppLog[]> {
    let logs = Array.from(this.logs.values());

    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    if (component) {
      logs = logs.filter(log => log.component === component);
    }

    // Sort by created_at descending and limit
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    logs = logs.slice(0, limit);

    console.log(`[MockDB] Get logs: ${logs.length} logs`);
    return logs;
  }

  // =============================================================================
  // SYSTEM CONFIGURATION
  // =============================================================================

  async getConfig(key: string): Promise<any> {
    console.log(`[MockDB] Get config: ${key}`);

    // Return appropriate mock configs based on the key
    const configs: Record<string, any> = {
      'lead_scoring_rules': {
        phone_weight: 30,
        email_weight: 25,
        business_name_weight: 20,
        address_weight: 15,
        services_weight: 10,
        minimum_score: 60
      },
      'notification_settings': {
        email_enabled: false,
        sms_enabled: false,
        push_enabled: false
      },
      'processing_settings': {
        auto_process_leads: true,
        qualification_threshold: 70,
        max_processing_time: 300000
      }
    };

    return configs[key] || null;
  }

  async getSystemConfig(): Promise<SystemConfig> {
    const config: SystemConfig = {
      app_name: 'Field Snap AI',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      database_status: 'mock',
      ocr_provider: process.env.OCR_PROVIDER || 'mock',
      notification_settings: {
        email_enabled: false,
        sms_enabled: false,
        push_enabled: false,
      },
      processing_settings: {
        auto_process_leads: true,
        qualification_threshold: 70,
        max_processing_time: 300000, // 5 minutes
      },
    };

    console.log(`[MockDB] Get system config`);
    return config;
  }

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    const details = {
      database: 'mock',
      leads_count: this.leads.size,
      users_count: this.users.size,
      notifications_count: this.notifications.size,
      logs_count: this.logs.size,
      uptime: process.uptime(),
    };

    console.log(`[MockDB] Health check performed`);
    return {
      status: 'healthy',
      details,
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private generateId(): string {
    // Generate a UUID v4 compatible string for testing
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Debug method to clear all data
  clearAll(): void {
    this.leads.clear();
    this.users.clear();
    this.notifications.clear();
    this.logs.clear();
    console.log(`[MockDB] Cleared all data`);
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const mockDb = MockDatabaseProvider.getInstance();