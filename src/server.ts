/**
 * Field Snap AI - Express Web Server
 * 
 * Main server for the web application with REST API endpoints
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT || '8080');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for now, enable with proper config later
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.2.0'
  });
});

// API Routes

/**
 * POST /api/leads
 * Create a new lead from an image upload
 */
app.post('/api/leads', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image file provided',
        message: 'Please upload an image file'
      });
    }

    // TODO: Process image with OCR
    // TODO: Enrich lead data
    // TODO: Score and qualify lead
    // TODO: Save to Supabase

    res.json({
      success: true,
      message: 'Lead processing started',
      leadId: 'temp-id',
      // Temporary response until full implementation
      data: {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      }
    });
  } catch (error) {
    console.error('Error processing lead:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/leads
 * Get all leads for the authenticated user
 */
app.get('/api/leads', async (req: Request, res: Response) => {
  try {
    // TODO: Get user from auth token
    // TODO: Fetch leads from Supabase
    
    res.json({
      success: true,
      leads: [],
      total: 0,
      message: 'Lead fetching not yet implemented'
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      error: 'Fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/leads/:id
 * Get a specific lead by ID
 */
app.get('/api/leads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Fetch lead from Supabase
    
    res.json({
      success: true,
      lead: null,
      message: 'Lead detail fetching not yet implemented'
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      error: 'Fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/leads/:id
 * Update a lead
 */
app.put('/api/leads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // TODO: Update lead in Supabase
    
    res.json({
      success: true,
      message: 'Lead update not yet implemented'
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      error: 'Update failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead
 */
app.delete('/api/leads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Delete lead from Supabase
    
    res.json({
      success: true,
      message: 'Lead deletion not yet implemented'
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/logs
 * Get application logs (public access with filtering)
 */
app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    const { component, level, limit = '50' } = req.query;
    
    // TODO: Fetch logs from Supabase
    
    res.json({
      success: true,
      logs: [],
      message: 'Log fetching not yet implemented'
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      error: 'Fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch-all route - serve index.html for client-side routing
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 Field Snap AI - Web Server Started');
  console.log('='.repeat(50));
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Web App: http://localhost:${PORT}/`);
  console.log(`🔧 API Endpoints: http://localhost:${PORT}/api/*`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});

export default app;
