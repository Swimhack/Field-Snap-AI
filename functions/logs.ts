/**
 * Field Snap AI - Public Logs API
 * 
 * This endpoint provides secure public access to application logs
 * for AI agent integration and monitoring purposes.
 */

import { db } from '../src/providers/db';
import { createLogger, generateRequestId } from '../src/utils/logger';
import type { LogLevel } from '../src/core/types';

/**
 * Public logs API handler
 */
export async function handler(request: Request): Promise<Response> {
  const requestId = generateRequestId();
  const logger = createLogger('logs-api', requestId);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', message: 'Only GET requests are supported' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    // Parse query parameters
    const limit = Math.min(parseInt(params.get('limit') || '100'), 1000); // Max 1000 logs
    const level = params.get('level') as LogLevel | null;
    const component = params.get('component') || undefined;
    const hours = parseInt(params.get('hours') || '24'); // Default last 24 hours

    // Calculate start date for time filtering
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    logger.info('Public logs request', {
      data: { limit, level, component, hours, startDate },
    });

    // Get public logs (uses secure view)
    const logs = await db.getPublicLogs({
      limit,
      level,
      component,
    });

    // Filter by time range
    const filteredLogs = logs.filter(log => log.created_at >= startDate);

    // Format response
    const response = {
      success: true,
      logs: filteredLogs,
      meta: {
        total: filteredLogs.length,
        limit,
        level: level || 'all',
        component: component || 'all',
        timeRange: `${hours} hours`,
        generatedAt: new Date().toISOString(),
        requestId,
      },
    };

    logger.info('Public logs request completed', {
      data: { logCount: filteredLogs.length, level, component },
    });

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    logger.error('Public logs request failed', error as Error);

    const errorResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      error: error instanceof Error ? error.name : 'UnknownError',
      requestId,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Development server for logs endpoint
if (import.meta.main) {
  const port = parseInt(process.env.LOGS_PORT || '3002');
  
  console.log(`📊 Field Snap AI Logs API starting on port ${port}`);
  console.log(`📍 Endpoint: http://localhost:${port}/`);
  console.log(`📖 Example: http://localhost:${port}/?level=error&component=ocr&hours=1`);
  
  Bun.serve({
    port,
    async fetch(request) {
      const requestId = generateRequestId();
      const logger = createLogger('logs-server', requestId);
      
      logger.info(`${request.method} ${new URL(request.url).pathname}`, {
        data: { userAgent: request.headers.get('User-Agent') },
      });

      return handler(request);
    },
  });
}
