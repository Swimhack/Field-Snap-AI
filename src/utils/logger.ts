/**
 * Field Snap AI - Application Logger
 * 
 * This module provides comprehensive logging functionality with
 * structured logging, different log levels, and database persistence.
 */

import type { LogLevel } from '../core/types.js';

export interface LogContext {
  userId?: string;
  leadId?: string;
  requestId?: string;
  sessionId?: string;
  duration?: number;
  errorCode?: string;
  data?: Record<string, any>;
  businessName?: string;
  error?: any;
  stack_trace?: string;
  location?: string;
  foundData?: any;
}

export class Logger {
  private component: string;
  private requestId?: string;

  constructor(component: string, requestId?: string) {
    this.component = component;
    this.requestId = requestId;
  }

  /**
   * Log debug message
   */
  debug(message: string, context: LogContext = {}): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context: LogContext = {}): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context: LogContext = {}): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context: LogContext = {}): void {
    const errorContext = {
      ...context,
      stack_trace: error?.stack,
      errorCode: context.errorCode || error?.name,
    };
    
    this.log('error', message, errorContext);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error, context: LogContext = {}): void {
    const errorContext = {
      ...context,
      stack_trace: error?.stack,
      errorCode: context.errorCode || error?.name,
    };
    
    this.log('fatal', message, errorContext);
  }

  /**
   * Core logging method
   */
  private async log(level: LogLevel, message: string, context: LogContext = {}): Promise<void> {
    const logLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;
    const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    
    // Check if we should log this level
    if (logLevels.indexOf(level) < logLevels.indexOf(logLevel)) {
      return;
    }

    // Console logging
    this.logToConsole(level, message, context);

    // Database logging disabled for now
    // TODO: Implement database logging when Supabase is integrated
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(level: LogLevel, message: string, context: LogContext): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      component: this.component,
      message,
      requestId: this.requestId || context.requestId,
      ...context,
    };

    // Color coding for different levels
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      fatal: '\x1b[35m', // Magenta
    };

    const reset = '\x1b[0m';
    const color = colors[level] || '';

    if (level === 'error' || level === 'fatal') {
      console.error(`${color}[${logData.level}]${reset} ${timestamp} [${this.component}] ${message}`, context);
    } else if (level === 'warn') {
      console.warn(`${color}[${logData.level}]${reset} ${timestamp} [${this.component}] ${message}`, context);
    } else {
      console.log(`${color}[${logData.level}]${reset} ${timestamp} [${this.component}] ${message}`, context);
    }
  }


  /**
   * Create a child logger with additional context
   */
  child(additionalContext: { component?: string; requestId?: string }): Logger {
    const component = additionalContext.component || this.component;
    const requestId = additionalContext.requestId || this.requestId;
    return new Logger(component, requestId);
  }

  /**
   * Time a function execution
   */
  async time<T>(operation: string, fn: () => Promise<T>, context: LogContext = {}): Promise<T> {
    const startTime = Date.now();
    this.debug(`Starting ${operation}`, context);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(`Completed ${operation}`, { ...context, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`Failed ${operation}`, error as Error, { ...context, duration });
      throw error;
    }
  }
}

/**
 * Create a logger for a specific component
 */
export function createLogger(component: string, requestId?: string): Logger {
  return new Logger(component, requestId);
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Express middleware to add request ID and logger to requests
 */
export function loggerMiddleware(req: any, res: any, next: any): void {
  const requestId = generateRequestId();
  req.requestId = requestId;
  req.logger = createLogger('api', requestId);
  
  req.logger.info(`${req.method} ${req.path}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    data: { query: req.query, params: req.params },
  });

  next();
}

// Default logger instance
export const logger = createLogger('app');
