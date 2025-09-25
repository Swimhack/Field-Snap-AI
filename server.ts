/**
 * Field Snap AI - Web Server
 *
 * Serves the web application and handles API requests
 */

import path from 'path';
import { handler as ingestHandler } from './functions/ingest';

const PORT = parseInt(process.env.PORT || '8080');
const PUBLIC_DIR = path.join(import.meta.dir, 'public');

console.log(`🚀 Field Snap AI Server starting on port ${PORT}`);
console.log(`📍 API Endpoint: http://localhost:${PORT}/api/ingest`);
console.log(`🌐 Web App: http://localhost:${PORT}/`);

Bun.serve({
    port: PORT,
    async fetch(request) {
        const url = new URL(request.url);

        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            });
        }

        // API routes
        if (url.pathname === '/api/ingest' || url.pathname === '/') {
            if (request.method === 'POST') {
                return ingestHandler(request);
            }
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
                return new Response('Forbidden', { status: 403 });
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

                    return new Response(file, {
                        headers: {
                            'Content-Type': contentType,
                            'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=3600',
                            'Access-Control-Allow-Origin': '*',
                        },
                    });
                }
            } catch (error) {
                console.error('Error serving file:', error);
            }
        }

        // 404 for everything else
        return new Response('Not Found', { status: 404 });
    },
});