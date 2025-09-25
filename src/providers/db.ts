/**
 * Field Snap AI - Database Provider (Supabase)
 * 
 * This module provides all database operations for the Field Snap AI application.
 * It includes CRUD operations for leads, users, notifications, logs, and system configuration.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { mockDb } from './mock-db';
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
// DATABASE CLIENT SETUP
// =============================================================================

class DatabaseProvider {
  private supabase: SupabaseClient;
  private static instance: DatabaseProvider;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Use mock database if Supabase is not configured
      console.warn('Supabase not configured, using mock database for testing');
      throw new Error('MOCK_DATABASE_REQUIRED');
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Test the connection by attempting a simple query
      // This will throw if there are connection issues
      this.supabase.from('leads').select('count', { count: 'exact', head: true }).then().catch(() => {
        throw new Error('Unable to connect to Supabase database');
      });
    } catch (error) {
      console.warn('Failed to initialize Supabase client:', error);
      throw new Error('Unable to connect to Supabase database');
    }
  }

  static getInstance(): DatabaseProvider {
    if (!DatabaseProvider.instance) {
      DatabaseProvider.instance = new DatabaseProvider();
    }
    return DatabaseProvider.instance;
  }

  // =============================================================================
  // LEAD OPERATIONS
  // =============================================================================

  /**
   * Create a new lead
   */
  async createLead(leadData: CreateLead): Promise<Lead> {
    const { data, error } = await this.supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create lead: ${error.message}`);
    }

    return data as Lead;
  }

  /**
   * Get a lead by ID
   */
  async getLeadById(id: string): Promise<Lead | null> {
    const { data, error } = await this.supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get lead: ${error.message}`);
    }

    return data as Lead;
  }

  /**
   * Update a lead
   */
  async updateLead(id: string, updates: UpdateLead): Promise<Lead> {
    const { data, error } = await this.supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }

    return data as Lead;
  }

  /**
   * Get leads with filtering and pagination
   */
  async getLeads(options: {
    limit?: number;
    offset?: number;
    status?: ProcessingStatus;
    qualification?: QualificationStatus;
    sortBy?: 'created_at' | 'updated_at' | 'lead_score';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ leads: Lead[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      status,
      qualification,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    let query = this.supabase
      .from('leads')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('processing_status', status);
    }

    if (qualification) {
      query = query.eq('qualification_status', qualification);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get leads: ${error.message}`);
    }

    return {
      leads: data as Lead[],
      total: count || 0,
    };
  }

  /**
   * Search leads by business name or other text fields
   */
  async searchLeads(searchTerm: string, limit = 20): Promise<Lead[]> {
    const { data, error } = await this.supabase
      .from('leads')
      .select('*')
      .or(`business_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search leads: ${error.message}`);
    }

    return data as Lead[];
  }

  /**
   * Get leads summary for dashboard
   */
  async getLeadsSummary(): Promise<{
    total: number;
    qualified: number;
    converted: number;
    processing: number;
    failed: number;
    avgScore: number;
  }> {
    const { data, error } = await this.supabase
      .from('leads')
      .select('processing_status, qualification_status, lead_score');

    if (error) {
      throw new Error(`Failed to get leads summary: ${error.message}`);
    }

    const leads = data as Pick<Lead, 'processing_status' | 'qualification_status' | 'lead_score'>[];
    
    return {
      total: leads.length,
      qualified: leads.filter(l => l.qualification_status === 'qualified').length,
      converted: leads.filter(l => l.qualification_status === 'converted').length,
      processing: leads.filter(l => l.processing_status === 'processing').length,
      failed: leads.filter(l => l.processing_status === 'failed').length,
      avgScore: leads.length > 0 
        ? leads.reduce((sum, l) => sum + l.lead_score, 0) / leads.length 
        : 0,
    };
  }

  // =============================================================================
  // USER OPERATIONS
  // =============================================================================

  /**
   * Create a new user
   */
  async createUser(userData: CreateUser): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Get a user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get user by email: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Update user
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }

    return data as User[];
  }

  // =============================================================================
  // NOTIFICATION OPERATIONS
  // =============================================================================

  /**
   * Create a notification
   */
  async createNotification(notificationData: CreateNotification): Promise<Notification> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    return data as Notification;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string, 
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
  ): Promise<Notification[]> {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    let query = this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get notifications: ${error.message}`);
    }

    return data as Notification[];
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Update notification delivery status
   */
  async updateNotificationDelivery(
    id: string, 
    updates: {
      email_sent?: boolean;
      sms_sent?: boolean;
      browser_sent?: boolean;
      email_sent_at?: string;
      sms_sent_at?: string;
      browser_sent_at?: string;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update notification delivery: ${error.message}`);
    }
  }

  // =============================================================================
  // APPLICATION LOG OPERATIONS
  // =============================================================================

  /**
   * Create a log entry
   */
  async createLog(logData: CreateLog): Promise<AppLog> {
    const { data, error } = await this.supabase
      .from('app_logs')
      .insert([logData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create log: ${error.message}`);
    }

    return data as AppLog;
  }

  /**
   * Get logs with filtering
   */
  async getLogs(options: {
    limit?: number;
    offset?: number;
    level?: LogLevel;
    component?: string;
    leadId?: string;
    requestId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ logs: AppLog[]; total: number }> {
    const {
      limit = 100,
      offset = 0,
      level,
      component,
      leadId,
      requestId,
      startDate,
      endDate,
    } = options;

    let query = this.supabase
      .from('app_logs')
      .select('*', { count: 'exact' });

    if (level) {
      query = query.eq('level', level);
    }

    if (component) {
      query = query.eq('component', component);
    }

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    if (requestId) {
      query = query.eq('request_id', requestId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }

    return {
      logs: data as AppLog[],
      total: count || 0,
    };
  }

  /**
   * Get public logs (for agent access) - filtered for security
   */
  async getPublicLogs(options: {
    limit?: number;
    level?: LogLevel;
    component?: string;
  } = {}): Promise<AppLog[]> {
    const { limit = 100, level, component } = options;

    let query = this.supabase
      .from('logs_public')  // Use the secure view
      .select('*');

    if (level) {
      query = query.eq('level', level);
    }

    if (component) {
      query = query.eq('component', component);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get public logs: ${error.message}`);
    }

    return data as AppLog[];
  }

  // =============================================================================
  // SYSTEM CONFIGURATION OPERATIONS
  // =============================================================================

  /**
   * Get system configuration by key
   */
  async getConfig(key: string): Promise<SystemConfig | null> {
    const { data, error } = await this.supabase
      .from('system_config')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get config: ${error.message}`);
    }

    return data as SystemConfig;
  }

  /**
   * Set system configuration
   */
  async setConfig(key: string, value: any, description?: string, category?: string): Promise<SystemConfig> {
    const { data, error } = await this.supabase
      .from('system_config')
      .upsert([{
        key,
        value,
        description,
        category: category || 'general',
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to set config: ${error.message}`);
    }

    return data as SystemConfig;
  }

  /**
   * Get all configurations
   */
  async getAllConfigs(): Promise<SystemConfig[]> {
    const { data, error } = await this.supabase
      .from('system_config')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      throw new Error(`Failed to get all configs: ${error.message}`);
    }

    return data as SystemConfig[];
  }

  // =============================================================================
  // UTILITY OPERATIONS
  // =============================================================================

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('system_config')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    totalLeads: number;
    totalUsers: number;
    totalNotifications: number;
    recentErrors: number;
  }> {
    try {
      const [leadsResult, usersResult, notificationsResult, errorsResult] = await Promise.all([
        this.supabase.from('leads').select('id', { count: 'exact', head: true }),
        this.supabase.from('users').select('id', { count: 'exact', head: true }),
        this.supabase.from('notifications').select('id', { count: 'exact', head: true }),
        this.supabase
          .from('app_logs')
          .select('id', { count: 'exact', head: true })
          .eq('level', 'error')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return {
        connected: true,
        totalLeads: leadsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalNotifications: notificationsResult.count || 0,
        recentErrors: errorsResult.count || 0,
      };
    } catch {
      return {
        connected: false,
        totalLeads: 0,
        totalUsers: 0,
        totalNotifications: 0,
        recentErrors: 0,
      };
    }
  }
}

// =============================================================================
// EXPORTS WITH MOCK FALLBACK
// =============================================================================

function createDatabaseInstance() {
  try {
    return DatabaseProvider.getInstance();
  } catch (error) {
    if (error instanceof Error &&
        (error.message === 'MOCK_DATABASE_REQUIRED' ||
         error.message.includes('Unable to connect') ||
         error.message.includes('Invalid API key') ||
         error.message.includes('Missing Supabase') ||
         error.message.includes('fetch') ||
         error.message.includes('network'))) {
      console.warn('Database connection failed, using mock database for testing...');
      console.warn('Error was:', error.message);
      return mockDb;
    }
    throw error;
  }
}

export const db = createDatabaseInstance();
export default db;
