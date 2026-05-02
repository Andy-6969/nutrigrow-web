-- ============================================================
-- NutriGrow: Migration 003 — Add notification_preferences
-- Run AFTER 002_new_roles_and_quarantine.sql
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "smart_delay": true,
    "cycle_complete": true,
    "device_alert": true,
    "override": false
  }'::jsonb;
