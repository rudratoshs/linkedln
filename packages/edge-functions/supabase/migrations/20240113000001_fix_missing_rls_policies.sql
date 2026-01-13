-- Fix missing RLS policies for user tables
-- This migration adds missing policies that allow authenticated users to manage their own data

-- Subscription Plans - Allow users to manage their own subscription data
-- (This policy was completely missing from the main migration)
CREATE POLICY "subscription_plans_user_access" ON subscription_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Rate Limits - Allow users to insert/update their own rate limit data
-- (The main migration only had SELECT policy, missing INSERT/UPDATE)
CREATE POLICY "rate_limits_user_insert" ON rate_limits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rate_limits_user_update" ON rate_limits
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Billing Guards - Allow users to manage their own billing data
-- (This policy was missing from the main migration)
CREATE POLICY "billing_guards_user_access" ON billing_guards
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);