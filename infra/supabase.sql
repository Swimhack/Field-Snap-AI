-- Field Snap AI Database Schema
-- This file contains the complete database schema for the Field Snap AI MVP

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Source information
    image_url TEXT NOT NULL,
    source_location TEXT,
    source_notes TEXT,
    
    -- OCR extracted data
    business_name TEXT,
    phone_number TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    services TEXT[],
    raw_ocr_text TEXT,
    
    -- Enriched data
    social_media JSONB DEFAULT '{}',
    reviews JSONB DEFAULT '{}',
    business_hours JSONB DEFAULT '{}',
    additional_contacts JSONB DEFAULT '{}',
    
    -- Scoring and qualification
    lead_score INTEGER DEFAULT 0,
    qualification_status TEXT DEFAULT 'pending' CHECK (qualification_status IN ('pending', 'qualified', 'unqualified', 'contacted', 'converted')),
    qualification_notes TEXT,
    
    -- Outreach data
    preview_website_url TEXT,
    sms_draft TEXT,
    email_draft TEXT,
    outreach_status TEXT DEFAULT 'not_sent' CHECK (outreach_status IN ('not_sent', 'scheduled', 'sent', 'responded', 'bounced')),
    outreach_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Processing status
    processing_status TEXT DEFAULT 'received' CHECK (processing_status IN ('received', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    processing_steps JSONB DEFAULT '{}',
    
    -- Application logs and audit trail
    logs JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_qualification_status ON leads(qualification_status);
CREATE INDEX IF NOT EXISTS idx_leads_processing_status ON leads(processing_status);
CREATE INDEX IF NOT EXISTS idx_leads_outreach_status ON leads(outreach_status);
CREATE INDEX IF NOT EXISTS idx_leads_business_name ON leads USING gin(business_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON leads(phone_number);

-- Create users table for notification preferences and authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    
    -- Notification preferences
    notification_preferences JSONB DEFAULT '{
        "email": {"enabled": true, "types": ["lead_qualified", "system_alerts", "daily_summary"]},
        "sms": {"enabled": false, "types": ["urgent_alerts"], "phone": null},
        "browser": {"enabled": true, "types": ["lead_qualified", "processing_complete"]},
        "sound": {"enabled": true},
        "haptic": {"enabled": true}
    }',
    
    timezone TEXT DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}'
);

-- Create notifications table for enterprise notification system
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'lead_qualified', 'system_alert', 'processing_complete', etc.
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    
    -- Delivery status
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    browser_sent BOOLEAN DEFAULT false,
    
    email_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent_at TIMESTAMP WITH TIME ZONE,
    browser_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- User interaction
    read_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Related entity
    related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- Create application logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS app_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    component TEXT NOT NULL, -- 'ocr', 'enrichment', 'scoring', 'outreach', etc.
    
    -- Context data
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    request_id TEXT,
    session_id TEXT,
    
    -- Technical details
    stack_trace TEXT,
    error_code TEXT,
    duration_ms INTEGER,
    
    -- Additional context
    data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for logs
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_component ON app_logs(component);
CREATE INDEX IF NOT EXISTS idx_app_logs_lead_id ON app_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_request_id ON app_logs(request_id);

-- Create system configuration table
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    requires_admin BOOLEAN DEFAULT true,
    
    metadata JSONB DEFAULT '{}'
);

-- Insert default system configurations
INSERT INTO system_config (key, value, description, category, is_public) VALUES
('lead_scoring_rules', '{
    "phone_number": 25,
    "email": 20,
    "website": 15,
    "social_media": 10,
    "business_hours": 5,
    "reviews_count": 15,
    "reviews_rating": 10
}', 'Scoring rules for lead qualification', 'scoring', false),
('ocr_providers', '{
    "primary": "google_vision",
    "fallback": "openai_vision",
    "timeout_ms": 30000
}', 'OCR provider configuration', 'processing', false),
('notification_templates', '{
    "lead_qualified": {
        "email_subject": "New Qualified Lead: {business_name}",
        "email_body": "A new lead has been qualified...",
        "sms_body": "New qualified lead: {business_name} - Score: {lead_score}"
    }
}', 'Notification message templates', 'notifications', false),
('rate_limits', '{
    "ingest_per_minute": 100,
    "ocr_per_hour": 1000,
    "enrichment_per_hour": 500
}', 'API rate limiting configuration', 'api', false);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (basic - should be customized based on auth requirements)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view leads they have access to" ON leads FOR SELECT USING (true); -- Customize based on user roles
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all logs" ON app_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Create views for common queries
CREATE OR REPLACE VIEW leads_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE qualification_status = 'qualified') as qualified_leads,
    COUNT(*) FILTER (WHERE qualification_status = 'converted') as converted_leads,
    AVG(lead_score) as avg_score,
    COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_processing
FROM leads
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create a view for application logs with better readability
CREATE OR REPLACE VIEW logs_public AS
SELECT 
    id,
    created_at,
    level,
    message,
    component,
    lead_id,
    request_id,
    duration_ms,
    (CASE 
        WHEN level IN ('error', 'fatal') THEN data
        ELSE '{}'::jsonb
    END) as error_data
FROM app_logs
WHERE level != 'debug'
ORDER BY created_at DESC;
