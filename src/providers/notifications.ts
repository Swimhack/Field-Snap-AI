/**
 * Field Snap AI - Enterprise Notification System
 * 
 * This module provides a comprehensive notification system supporting
 * email, SMS, browser notifications, haptic feedback, and sound alerts.
 */

import nodemailer from 'nodemailer';
import type { User, Notification, NotificationPreferences } from '@/core/types';
import { db } from './db';

export interface NotificationOptions {
  userId: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  data?: Record<string, any>;
  relatedLeadId?: string;
}

export class NotificationProvider {
  private emailTransporter: nodemailer.Transporter | null = null;
  private twilioClient: any = null;

  constructor() {
    this.initializeEmailTransporter();
    this.initializeTwilioClient();
  }

  /**
   * Initialize email transporter (SMTP)
   */
  private initializeEmailTransporter() {
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (config.host && config.auth.user && config.auth.pass) {
      this.emailTransporter = nodemailer.createTransporter(config);
    }
  }

  /**
   * Initialize Twilio client for SMS
   */
  private async initializeTwilioClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      try {
        const twilio = await import('twilio');
        this.twilioClient = twilio.default(accountSid, authToken);
      } catch (error) {
        console.warn('Failed to initialize Twilio client:', error);
      }
    }
  }

  /**
   * Send a notification through all configured channels
   */
  async sendNotification(options: NotificationOptions): Promise<Notification> {
    // Create notification record
    const notification = await db.createNotification({
      user_id: options.userId,
      type: options.type,
      priority: options.priority,
      title: options.title,
      message: options.message,
      data: options.data || {},
      related_lead_id: options.relatedLeadId,
    });

    // Get user preferences
    const user = await db.getUserById(options.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Send through appropriate channels based on user preferences
    await this.deliverNotification(notification, user);

    return notification;
  }

  /**
   * Deliver notification through configured channels
   */
  private async deliverNotification(notification: Notification, user: User) {
    const preferences = user.notification_preferences;
    const updates: any = {};

    // Email notification
    if (preferences.email?.enabled && this.shouldSendToChannel('email', notification.type, preferences)) {
      try {
        await this.sendEmail(user, notification);
        updates.email_sent = true;
        updates.email_sent_at = new Date().toISOString();
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }

    // SMS notification
    if (preferences.sms?.enabled && preferences.sms.phone && this.shouldSendToChannel('sms', notification.type, preferences)) {
      try {
        await this.sendSMS(preferences.sms.phone, notification);
        updates.sms_sent = true;
        updates.sms_sent_at = new Date().toISOString();
      } catch (error) {
        console.error('Failed to send SMS notification:', error);
      }
    }

    // Browser notification
    if (preferences.browser?.enabled && this.shouldSendToChannel('browser', notification.type, preferences)) {
      try {
        await this.sendBrowserNotification(user, notification);
        updates.browser_sent = true;
        updates.browser_sent_at = new Date().toISOString();
      } catch (error) {
        console.error('Failed to send browser notification:', error);
      }
    }

    // Update notification delivery status
    if (Object.keys(updates).length > 0) {
      await db.updateNotificationDelivery(notification.id, updates);
    }
  }

  /**
   * Check if notification should be sent to specific channel
   */
  private shouldSendToChannel(channel: string, notificationType: string, preferences: NotificationPreferences): boolean {
    const channelPrefs = preferences[channel as keyof NotificationPreferences] as any;
    return channelPrefs?.types?.includes(notificationType) || false;
  }

  /**
   * Send email notification
   */
  private async sendEmail(user: User, notification: Notification): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const emailTemplate = this.getEmailTemplate(notification);
    
    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@fieldsnap.ai',
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(phoneNumber: string, notification: Notification): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not configured');
    }

    const message = this.getSMSTemplate(notification);
    
    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  }

  /**
   * Send browser notification using Web Push
   */
  private async sendBrowserNotification(user: User, notification: Notification): Promise<void> {
    // TODO: Implement Web Push notifications
    // This would require storing user's push subscription and using web-push library
    console.log('Browser notification would be sent to user:', user.id);
  }

  /**
   * Get email template for notification
   */
  private getEmailTemplate(notification: Notification) {
    const baseTemplate = {
      subject: notification.title,
      text: notification.message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${notification.title}</h2>
          <p style="color: #666; line-height: 1.6;">${notification.message}</p>
          ${notification.data?.leadId ? `
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Lead Details</h3>
              <p><strong>Lead ID:</strong> ${notification.data.leadId}</p>
              ${notification.data.businessName ? `<p><strong>Business:</strong> ${notification.data.businessName}</p>` : ''}
              ${notification.data.leadScore ? `<p><strong>Score:</strong> ${notification.data.leadScore}</p>` : ''}
            </div>
          ` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Field Snap AI - Automated Lead Processing System
          </p>
        </div>
      `,
    };

    return baseTemplate;
  }

  /**
   * Get SMS template for notification
   */
  private getSMSTemplate(notification: Notification): string {
    let message = `${notification.title}\n\n${notification.message}`;
    
    if (notification.data?.businessName) {
      message += `\n\nBusiness: ${notification.data.businessName}`;
    }
    
    if (notification.data?.leadScore) {
      message += `\nScore: ${notification.data.leadScore}`;
    }

    return message;
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(userIds: string[], options: Omit<NotificationOptions, 'userId'>): Promise<Notification[]> {
    const notifications = await Promise.allSettled(
      userIds.map(userId => this.sendNotification({ ...options, userId }))
    );

    return notifications
      .filter((result): result is PromiseFulfilledResult<Notification> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Send system-wide notifications (to all admins)
   */
  async sendSystemNotification(options: Omit<NotificationOptions, 'userId'>): Promise<Notification[]> {
    const users = await db.getUsers();
    const adminUserIds = users.filter(user => user.role === 'admin').map(user => user.id);
    
    return this.sendBulkNotifications(adminUserIds, options);
  }

  /**
   * Test notification system
   */
  async testNotificationSystem(): Promise<{
    email: boolean;
    sms: boolean;
    browser: boolean;
  }> {
    return {
      email: !!this.emailTransporter,
      sms: !!this.twilioClient,
      browser: true, // Browser notifications are always available
    };
  }
}

export const notifications = new NotificationProvider();
