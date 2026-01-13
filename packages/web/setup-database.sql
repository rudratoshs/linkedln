-- PostPhantom Database Setup
-- Run this SQL in your Supabase SQL Editor to create all required tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create basic tables needed for the web dashboard
-- (This is a simplified version of the full schema for quick setup)

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_provider TEXT DEFAULT 'openai',
  generation_temperature DECIMAL(3,2) DEFAULT 0.7,
  max_drafts_per_request INTEGER DEFAULT 3,
  anti_cheerleader_enabled BOOLEAN DEFAULT true,
  typing_speed_multiplier DECIMAL(3,2) DEFAULT 1.0,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_preferred_provider CHECK (preferred_provider IN ('openai', 'gemini')),
  CONSTRAINT valid_temperature CHECK (generation_temperature >= 0 AND generation_temperature <= 2),
  CONSTRAINT valid_max_drafts CHECK (max_drafts_per_request >= 1 AND max_drafts_per_request <= 10),
  CONSTRAINT valid_typing_speed CHECK (typing_speed_multiplier >= 0.1 AND typing_speed_multiplier <= 5.0)
);

-- Voice personas table
CREATE TABLE IF NOT EXISTS voice_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_name TEXT NOT NULL,
  persona_description TEXT NOT NULL,
  tone_attributes JSONB NOT NULL DEFAULT '{}',
  example_phrases TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT non_empty_name CHECK (length(trim(persona_name)) > 0),
  CONSTRAINT non_empty_description CHECK (length(trim(persona_description)) > 0),
  UNIQUE(user_id, persona_name)
);

-- Request logs table
CREATE TABLE IF NOT EXISTS request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  estimated_tokens INTEGER,
  actual_tokens INTEGER,
  safety_ratings JSONB,
  request_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  response_time_ms INTEGER,
  used_vision BOOLEAN DEFAULT false,
  input_modalities JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_provider_logs CHECK (provider IN ('openai', 'gemini')),
  CONSTRAINT valid_request_type CHECK (request_type IN ('generation', 'embedding', 'moderation')),
  CONSTRAINT positive_tokens CHECK (estimated_tokens IS NULL OR estimated_tokens > 0),
  CONSTRAINT positive_actual_tokens CHECK (actual_tokens IS NULL OR actual_tokens > 0),
  CONSTRAINT positive_response_time CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
);

-- Rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_count INTEGER DEFAULT 0,
  hourly_count INTEGER DEFAULT 0,
  last_request_at TIMESTAMPTZ,
  daily_reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
  hourly_reset_at TIMESTAMPTZ DEFAULT (date_trunc('hour', NOW()) + INTERVAL '1 hour'),
  is_locked BOOLEAN DEFAULT false,
  lock_expires_at TIMESTAMPTZ,
  lock_reason TEXT,
  
  CONSTRAINT non_negative_daily_count CHECK (daily_count >= 0),
  CONSTRAINT non_negative_hourly_count CHECK (hourly_count >= 0),
  CONSTRAINT valid_lock_state CHECK (
    (is_locked = false AND lock_expires_at IS NULL AND lock_reason IS NULL) OR
    (is_locked = true AND lock_expires_at IS NOT NULL AND lock_reason IS NOT NULL)
  ),
  CONSTRAINT valid_lock_reason CHECK (
    lock_reason IS NULL OR 
    lock_reason IN ('hourly_limit', 'daily_limit', 'safety_violation', 'manual_lock')
  )
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free',
  daily_generation_limit INTEGER DEFAULT 50,
  monthly_generation_limit INTEGER DEFAULT 1500,
  features_enabled JSONB DEFAULT '{}',
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  CONSTRAINT positive_limits CHECK (
    daily_generation_limit > 0 AND 
    monthly_generation_limit > 0
  )
);

-- Billing guards table
CREATE TABLE IF NOT EXISTS billing_guards (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_spend_limit DECIMAL(10,2) DEFAULT 0.00,
  current_month_spend DECIMAL(10,2) DEFAULT 0.00,
  spend_reset_at TIMESTAMPTZ DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  overage_protection BOOLEAN DEFAULT true,
  overage_threshold DECIMAL(3,2) DEFAULT 0.8,
  last_billing_check TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT non_negative_spend_limit CHECK (monthly_spend_limit >= 0),
  CONSTRAINT non_negative_current_spend CHECK (current_month_spend >= 0),
  CONSTRAINT valid_overage_threshold CHECK (
    overage_threshold >= 0.0 AND overage_threshold <= 1.0
  )
);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_guards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation
CREATE POLICY "user_preferences_isolation" ON user_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "voice_personas_isolation" ON voice_personas
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "request_logs_user_read" ON request_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "rate_limits_user_read" ON rate_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "subscription_plans_isolation" ON subscription_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "billing_guards_isolation" ON billing_guards
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_personas_user_active ON voice_personas(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_created ON request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_times ON rate_limits(daily_reset_at, hourly_reset_at);

-- Automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_personas_updated_at 
  BEFORE UPDATE ON voice_personas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'PostPhantom database setup completed successfully!' as message;