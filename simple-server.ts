/**
 * Simple Field Snap AI Server - For deployment testing
 * Minimal server that can start without external dependencies
 */

const PORT = parseInt(process.env.PORT || '8080');

console.log(`🚀 Field Snap AI Server starting on port ${PORT}`);
console.log(`📍 API Endpoint: http://localhost:${PORT}/api/ingest`);
console.log(`🌐 Web App: http://localhost:${PORT}/`);

const server = Bun.serve({
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
        if (url.pathname === '/api/ingest') {
            if (request.method === 'POST') {
                return new Response(JSON.stringify({
                    success: true,
                    message: "Field Snap AI is deployed and working! Configure Supabase to enable full functionality.",
                    status: "deployment_test"
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
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

            try {
                const file = Bun.file(`./public${filePath}`);

                // Check if file exists
                if (await file.exists()) {
                    // Determine content type
                    let contentType = 'text/plain';
                    const ext = filePath.split('.').pop()?.toLowerCase();

                    const contentTypes: Record<string, string> = {
                        'html': 'text/html',
                        'css': 'text/css',
                        'js': 'application/javascript',
                        'json': 'application/json',
                        'png': 'image/png',
                        'jpg': 'image/jpeg',
                        'jpeg': 'image/jpeg',
                        'gif': 'image/gif',
                        'svg': 'image/svg+xml',
                        'ico': 'image/x-icon',
                    };

                    if (ext && ext in contentTypes) {
                        contentType = contentTypes[ext];
                    }

                    return new Response(file, {
                        headers: {
                            'Content-Type': contentType,
                            'Cache-Control': ext === 'html' ? 'no-cache' : 'max-age=3600',
                            'Access-Control-Allow-Origin': '*',
                        },
                    });
                }
            } catch (error) {
                console.error('Error serving file:', error);
            }
        }

        // Health check endpoint
        if (url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                message: 'Field Snap AI deployment successful!'
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        // 404 for everything else
        return new Response('Not Found', { status: 404 });
    },
});

console.log(`✅ Server started successfully on http://localhost:${PORT}`);