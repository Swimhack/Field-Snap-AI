/**
 * Field Snap AI - Production Server with Logging
 * Enhanced server with public logging endpoint and graceful error handling
 */

import path from 'path';
import { appendFile } from 'fs/promises';
import { db } from './src/providers/db';
import { createLogger } from './src/utils/logger';

const PORT = parseInt(process.env.PORT || '8080');
const PUBLIC_DIR = path.join(import.meta.dir, 'public');
const LOGS_TOKEN = process.env.LOGS_TOKEN;
const LOGS_MAX_ENTRIES = parseInt(process.env.LOGS_MAX_ENTRIES || '5000');
const LOG_FILE_PATH = process.env.LOG_FILE_PATH;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
  component?: string;
  requestId?: string;
  context?: any;
}

// In-memory log storage for the session
const logs: LogEntry[] = [];
let nextLogId = 1;

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Log level threshold from env
const LOG_LEVEL_ENV = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const LOG_THRESHOLD = LEVEL_ORDER[LOG_LEVEL_ENV] ?? 20;

function redactSensitive(input: any): any {
  try {
    if (input == null) return input;
    if (typeof input !== 'object') return input;

    const SENSITIVE_KEYS = new Set([
      'authorization','password','pass','token','apiKey','apikey','key','secret','cookie','set-cookie'
    ]);

    const seen = new WeakSet();
    const clone = (obj: any): any => {
      if (obj == null || typeof obj !== 'object') return obj;
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);
      if (Array.isArray(obj)) return obj.map(clone);
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(k.toLowerCase())) {
          out[k] = '[REDACTED]';
        } else {
          out[k] = clone(v);
        }
      }
      return out;
    };
    return clone(input);
  } catch {
    return '[Unserializable Context]';
  }
}

// Enhanced logging function with database persistence
const serverLogger = createLogger('production-server');

function log(level: LogLevel, message: string, context?: any) {
  // Keep in-memory logging for backwards compatibility and performance
  if (LEVEL_ORDER[level] >= LOG_THRESHOLD) {
    const now = new Date().toISOString();
    const component = context && typeof context === 'object' ? (context.component as string | undefined) : undefined;
    const requestId = context && typeof context === 'object' ? (context.requestId as string | undefined) : undefined;
    const entry: LogEntry = {
      id: nextLogId++,
      timestamp: now,
      level,
      message,
      component,
      requestId,
      context: redactSensitive(context)
    };

    logs.push(entry);
    if (logs.length > LOGS_MAX_ENTRIES) {
      logs.splice(0, logs.length - LOGS_MAX_ENTRIES);
    }

    // Best-effort append to file if configured
    if (LOG_FILE_PATH) {
      const line = JSON.stringify(entry) + '\n';
      appendFile(LOG_FILE_PATH, line).catch((e) => {
        console.error('Failed to append log file:', e);
      });
    }

    // Also log to console
    console.log(`[${now}] ${level.toUpperCase()}: ${message}`, context || '');
  }

  // Also use database logger for persistence and comprehensive tracking
  const logger = context?.requestId ? createLogger(context.component || 'server', context.requestId) : serverLogger;
  
  const logContext = {
    ...context,
    component: context?.component || 'server',
    data: context || {}
  };

  switch (level) {
    case 'debug':
      logger.debug(message, logContext);
      break;
    case 'info':
      logger.info(message, logContext);
      break;
    case 'warn':
      logger.warn(message, logContext);
      break;
    case 'error':
      logger.error(message, context?.error, logContext);
      break;
    default:
      logger.info(message, logContext);
  }
}

// Function to get comprehensive logs from both in-memory and database
async function getComprehensiveLogs(filters: {
  level?: LogLevel;
  component?: string;
  requestId?: string;
  since?: string;
  until?: string;
  search?: string;
  limit?: number;
}) {
  try {
    // Get database logs for comprehensive tracking
    const dbResult = await db.getLogs({
      limit: filters.limit || 500,
      level: filters.level,
      component: filters.component,
      requestId: filters.requestId,
      startDate: filters.since,
      endDate: filters.until,
    });

    let dbLogs = dbResult.logs.map(log => ({
      id: `db_${log.id}`,
      timestamp: log.created_at,
      level: log.level,
      message: log.message,
      component: log.component,
      requestId: log.request_id,
      leadId: log.lead_id,
      context: {
        ...log.data,
        duration: log.duration_ms,
        errorCode: log.error_code,
        stackTrace: log.stack_trace,
        source: 'database'
      }
    }));

    // Get in-memory logs for recent real-time activity
    let memoryLogs = logs.map(log => ({
      ...log,
      id: `mem_${log.id}`,
      context: {
        ...log.context,
        source: 'memory'
      }
    }));

    // Apply filters to memory logs
    if (filters.level) {
      memoryLogs = memoryLogs.filter(log => log.level === filters.level);
    }
    if (filters.component) {
      memoryLogs = memoryLogs.filter(log => log.component === filters.component);
    }
    if (filters.requestId) {
      memoryLogs = memoryLogs.filter(log => log.requestId === filters.requestId);
    }
    if (filters.since) {
      memoryLogs = memoryLogs.filter(log => log.timestamp >= filters.since!);
    }
    if (filters.until) {
      memoryLogs = memoryLogs.filter(log => log.timestamp <= filters.until!);
    }

    // Apply search filter if specified
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      dbLogs = dbLogs.filter(log =>
        log.message.toLowerCase().includes(needle) ||
        JSON.stringify(log.context || {}).toLowerCase().includes(needle)
      );
      memoryLogs = memoryLogs.filter(log =>
        log.message.toLowerCase().includes(needle) ||
        JSON.stringify(log.context || {}).toLowerCase().includes(needle)
      );
    }

    // Combine and sort by timestamp (most recent first)
    const allLogs = [...dbLogs, ...memoryLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply final limit
    const finalLogs = allLogs.slice(0, filters.limit || 500);

    return {
      logs: finalLogs,
      total: dbResult.total + logs.length,
      sources: {
        database: dbLogs.length,
        memory: memoryLogs.length
      }
    };
  } catch (error) {
    console.error('Failed to fetch comprehensive logs:', error);
    // Fallback to in-memory logs only
    let filteredLogs = [...logs];
    
    // Apply filters to fallback logs
    if (filters.level) filteredLogs = filteredLogs.filter(l => l.level === filters.level);
    if (filters.component) filteredLogs = filteredLogs.filter(l => l.component === filters.component);
    if (filters.requestId) filteredLogs = filteredLogs.filter(l => l.requestId === filters.requestId);
    if (filters.since) filteredLogs = filteredLogs.filter(l => l.timestamp >= filters.since!);
    if (filters.until) filteredLogs = filteredLogs.filter(l => l.timestamp <= filters.until!);
    
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(l =>
        (l.message && l.message.toLowerCase().includes(needle)) ||
        JSON.stringify(l.context || {}).toLowerCase().includes(needle)
      );
    }

    return { 
      logs: filteredLogs.slice(-200), 
      total: filteredLogs.length,
      sources: { database: 0, memory: filteredLogs.length },
      error: 'Database logs unavailable - showing memory logs only'
    };
  }
}

// Graceful import of the ingest handler
let ingestHandler: ((request: Request) => Promise<Response>) | null = null;

try {
  const module = await import('./functions/ingest');
  ingestHandler = module.handler;
  log('info', 'Successfully loaded ingest handler', { component: 'server' });
} catch (error) {
  log('error', 'Failed to load ingest handler, will serve in demo mode', {
    error: error instanceof Error ? error.message : String(error)
  });

  // Create a demo handler that explains the issue
  ingestHandler = async (request: Request) => {
    log('warn', 'Ingest request received but handler not available due to missing dependencies', { component: 'ingest' });

    try {
      const body = await request.json();
      log('info', 'Ingest request body received', {
        hasImageUrl: !!body.imageUrl,
        hasLocation: !!body.sourceLocation
      });
    } catch (e) {
      log('error', 'Failed to parse request body', { error: String(e), component: 'ingest' });
    }

    return new Response(JSON.stringify({
      success: false,
      error: "CONFIGURATION_REQUIRED",
      message: "Image processing requires external service configuration. Please set up Supabase, Google Vision API, and other required services.",
      details: "The application is deployed but missing required environment variables for full functionality.",
      required_services: [
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (database)",
                        "Enhanced Tesseract OCR (primary), OPENAI_API_KEY (fallback), GOOGLE_CLOUD_VISION (legacy)",
        "TWILIO_* (SMS notifications - optional)",
        "SMTP_* (Email notifications - optional)"
      ]
    }), {
      status: 422,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  };
}

console.log(`🚀 Field Snap AI Production Server starting on port ${PORT}`);
console.log(`📍 API Endpoint: http://localhost:${PORT}/api/ingest`);
console.log(`🌐 Web App: http://localhost:${PORT}/`);
console.log(`📊 Logs endpoint: http://localhost:${PORT}/logs`);
console.log(`🔐 Auth: Authorization: Bearer <LOGS_TOKEN>${LOGS_TOKEN ? '' : ' (set LOGS_TOKEN env var)'}`);

log('info', 'Field Snap AI Production Server starting', { port: PORT });

Bun.serve({
    port: PORT,
    async fetch(request) {
        const url = new URL(request.url);
        const requestId = generateRequestId();

        // Log all incoming requests
        log('debug', `${request.method} ${url.pathname}`, {
          requestId,
          component: 'http',
          userAgent: request.headers.get('user-agent'),
          origin: request.headers.get('origin')
        });

        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            log('debug', 'CORS preflight request handled', { requestId, component: 'http' });
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'X-Request-Id': requestId,
                },
            });
        }

        // API lead details route
        if (url.pathname.startsWith('/api/leads/') && request.method === 'GET') {
            const id = url.pathname.split('/').pop() || '';
            try {
                const lead = await db.getLeadById(id);
                if (!lead) {
                    log('warn', 'Lead not found', { component: 'api', requestId, data: { id } });
                    return new Response(JSON.stringify({ success: false, error: 'NOT_FOUND', message: 'Lead not found' }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Request-Id': requestId },
                    });
                }
                log('info', 'Lead details returned', { component: 'api', requestId, data: { id: lead.id } });
                return new Response(JSON.stringify(lead, null, 2), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Request-Id': requestId },
                });
            } catch (e) {
                log('error', 'Failed to fetch lead details', e as Error, { component: 'api', requestId, data: { id } });
                return new Response(JSON.stringify({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch lead' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Request-Id': requestId },
                });
            }
        }

        // Public logging endpoint with token protection (bearer only)
        if (url.pathname === '/logs') {
            const authHeader = request.headers.get('authorization') || '';
            const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
              ? authHeader.slice(7).trim()
              : null;

            const isAuthorized = Boolean(LOGS_TOKEN && bearerToken === LOGS_TOKEN);

            if (!isAuthorized) {
                log('warn', 'Unauthorized logs access attempt', {
                  ip: request.headers.get('x-forwarded-for') || 'unknown',
                  requestId,
                  component: 'logs',
                  hasAuthHeader: !!authHeader
                });
                return new Response('Unauthorized', {
                  status: 401,
                  headers: {
                    'WWW-Authenticate': 'Bearer',
                    'Access-Control-Allow-Origin': '*',
                    'X-Request-Id': requestId,
                  }
                });
            }

            log('info', 'Logs accessed via public endpoint', { requestId, component: 'logs' });

            // Enhanced filtering and formatting for image processing analysis
            const level = url.searchParams.get('level') as LogLevel | null;
            const component = url.searchParams.get('component') || null;
            const requestIdFilter = url.searchParams.get('requestId') || null;
            const leadId = url.searchParams.get('leadId') || null;
            const search = url.searchParams.get('search');
            const since = url.searchParams.get('since');
            const until = url.searchParams.get('until');
            const format = (url.searchParams.get('format') || 'json').toLowerCase();
            const download = (url.searchParams.get('download') || '').toLowerCase();
            const limitParam = url.searchParams.get('limit');
            
            // New specialized filters for image processing analysis
            const imageProcessingOnly = url.searchParams.get('imageProcessing') === 'true';
            const extractionAttemptsOnly = url.searchParams.get('extractionAttempts') === 'true';
            const errorsOnly = url.searchParams.get('errorsOnly') === 'true';
            const successfulExtractions = url.searchParams.get('successfulExtractions') === 'true';

            // Get comprehensive logs from both database and memory
            const logsResult = await getComprehensiveLogs({
              level,
              component,
              requestId: requestIdFilter,
              since,
              until,
              search,
              limit: Math.max(1, Math.min(parseInt(limitParam || '500'), LOGS_MAX_ENTRIES))
            });

            const filteredLogs = logsResult.logs;

            if (format === 'ndjson') {
              const ndjson = filteredLogs.map(l => JSON.stringify(l)).join('\n') + (filteredLogs.length ? '\n' : '');
              const headers: Record<string, string> = {
                'Content-Type': 'application/x-ndjson',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store',
                'X-Request-Id': requestId,
              };
              if (download === '1' || download === 'true') {
                headers['Content-Disposition'] = 'attachment; filename="logs.ndjson"';
              }
              return new Response(ndjson, { headers });
            }

            const body = {
              total_logs: logsResult.total,
              filtered_logs: filteredLogs.length,
              logs: filteredLogs,
              server_info: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                environment: process.env.NODE_ENV || 'development'
              },
              sources: logsResult.sources,
              error: logsResult.error,
              request_id: requestId
            };

            return new Response(JSON.stringify(body, null, 2), {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store',
                'X-Request-Id': requestId,
              },
            });
        }

        // API ingest route
        if (url.pathname === '/api/ingest' && request.method === 'POST') {
            const requestStart = Date.now();
            // requestId created earlier

            // Log detailed request information
            log('info', '🚀 API REQUEST: Image processing request received', {
                requestId,
                component: 'ingest',
                url: url.pathname,
                method: request.method,
                timestamp: new Date().toISOString(),
                userAgent: request.headers.get('user-agent'),
                origin: request.headers.get('origin'),
                contentType: request.headers.get('content-type'),
                referer: request.headers.get('referer')
            });

            try {
                // Try to log request body size and type (without logging sensitive data)
                const contentLength = request.headers.get('content-length');
                if (contentLength) {
                    log('info', '📊 REQUEST INFO: Request details', {
                        requestId,
                        contentLength: parseInt(contentLength),
                        hasContentLength: true
                    });
                }

                const response = await ingestHandler!(request);
                const processingTime = Date.now() - requestStart;

                log('info', '✅ API SUCCESS: Image processing request completed', {
                    requestId,
                    component: 'ingest',
                    status: response.status,
                    processingTime,
                    success: response.status < 400,
                    systemInfo: {
                        ocrProvider: process.env.OCR_PROVIDER || 'tesseract',
                        mockOcrEnabled: process.env.MOCK_OCR === 'true',
                        databaseMode: process.env.SUPABASE_URL ? 'supabase' : 'mock'
                    }
                });

                const headers = new Headers(response.headers);
                headers.set('X-Request-Id', requestId);
                if (!headers.has('Access-Control-Allow-Origin')) headers.set('Access-Control-Allow-Origin', '*');
                return new Response(response.body, { status: response.status, headers });
            } catch (error) {
                const processingTime = Date.now() - requestStart;

                log('error', '❌ API ERROR: Image processing request failed', {
                    requestId,
                    component: 'ingest',
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    processingTime,
                    errorType: error instanceof Error ? error.constructor.name : typeof error,
                    systemConfig: {
                        hasSupabaseUrl: !!process.env.SUPABASE_URL,
                        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                        hasOpenaiKey: !!process.env.OPENAI_API_KEY,
                        hasGoogleCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
                        ocrProvider: process.env.OCR_PROVIDER || 'tesseract',
                        mockOcrEnabled: process.env.MOCK_OCR === 'true',
                        nodeEnv: process.env.NODE_ENV || 'development',
                        bunVersion: process.versions?.bun || 'unknown'
                    }
                });

                return new Response(JSON.stringify({
                    success: false,
                    error: "INTERNAL_ERROR",
                    message: "An internal error occurred while processing your request. Please check the logs for details.",
                    timestamp: new Date().toISOString(),
                    requestId
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'X-Request-Id': requestId,
                    },
                });
            }
        }

        // Health check endpoint
        if (url.pathname === '/health') {
            const healthStatus = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                message: 'Field Snap AI is running',
                services: {
                    ingest_handler: ingestHandler !== null,
                    logs_count: logs.length,
                    uptime_seconds: Math.floor(process.uptime())
                },
                environment: {
                    node_env: process.env.NODE_ENV,
                    has_supabase_url: !!process.env.SUPABASE_URL,
                    has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                    has_openai_key: !!process.env.OPENAI_API_KEY,
                    has_google_credentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
                }
            };

            log('debug', 'Health check requested', { component: 'health' });

            return new Response(JSON.stringify(healthStatus, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'X-Request-Id': requestId,
                },
            });
        }

        // Serve static files from public directory
        if (request.method === 'GET') {
            let filePath = url.pathname;

            // Default to index.html for root
            if (filePath === '/') {
                filePath = '/index.html';
            }

            // Security: prevent directory traversal
            if (filePath.includes('..')) {
                log('warn', 'Directory traversal attempt blocked', { path: filePath, component: 'static', requestId });
                return new Response('Forbidden', { status: 403, headers: { 'X-Request-Id': requestId, 'Access-Control-Allow-Origin': '*' } });
            }

            // Handle common favicon path to avoid noisy 404s
            if (filePath === '/favicon.ico') {
              const fallback = Bun.file(path.join(PUBLIC_DIR, 'icon-192.png'));
              if (await fallback.exists()) {
                return new Response(fallback, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400', 'Access-Control-Allow-Origin': '*', 'X-Request-Id': requestId } });
              }
            }

            const fullPath = path.join(PUBLIC_DIR, filePath);

            try {
                const file = Bun.file(fullPath);

                // Check if file exists
                if (await file.exists()) {
                    // Determine content type
                    let contentType = 'text/plain';
                    const ext = path.extname(filePath).toLowerCase();

                    const contentTypes: Record<string, string> = {
                        '.html': 'text/html',
                        '.css': 'text/css',
                        '.js': 'application/javascript',
                        '.json': 'application/json',
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.gif': 'image/gif',
                        '.svg': 'image/svg+xml',
                        '.ico': 'image/x-icon',
                    };

                    if (ext in contentTypes) {
                        contentType = contentTypes[ext];
                    }

                    log('debug', `Serving static file: ${filePath}`, { contentType, size: file.size, component: 'static', requestId });

                    const cacheControl = (ext === '.html' || ext === '.js' || ext === '.css')
                      ? 'no-cache'
                      : 'max-age=3600';

                    return new Response(file, {
                        headers: {
                            'Content-Type': contentType,
                            'Cache-Control': cacheControl,
                            'Access-Control-Allow-Origin': '*',
                            'X-Request-Id': requestId,
                        },
                    });
                } else {
                    log('warn', `Static file not found: ${filePath}`, { component: 'static', requestId });
                }
            } catch (error) {
                log('error', 'Error serving static file', {
                  path: filePath,
                  error: error instanceof Error ? error.message : String(error),
                  component: 'static',
                  requestId
                });
            }
        }

        // 404 for everything else
        log('debug', `404 - Not found: ${url.pathname}`, { component: 'http', requestId });
        return new Response('Not Found', { status: 404, headers: { 'X-Request-Id': requestId, 'Access-Control-Allow-Origin': '*' } });
    },
});

// Capture global errors and rejections into logs
process.on('uncaughtException', (err) => {
  log('error', 'Uncaught exception', {
    component: 'process',
    error: err?.message || String(err),
    stack: (err as any)?.stack,
  });
});

process.on('unhandledRejection', (reason) => {
  log('error', 'Unhandled promise rejection', {
    component: 'process',
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

log('info', 'Server started successfully', {
  port: PORT,
  hasIngestHandler: !!ingestHandler,
  publicDir: PUBLIC_DIR,
  component: 'server'
});

console.log(`✅ Server started successfully on http://localhost:${PORT}`);
console.log(`📊 Access logs at: http://localhost:${PORT}/logs (use Authorization header)`);