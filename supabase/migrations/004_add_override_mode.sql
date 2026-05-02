-- ============================================================
-- NutriGrow: Migration 004 — Add mode to override_logs
-- Run AFTER 003_add_notification_preferences.sql
-- ============================================================

ALTER TABLE public.override_logs
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'water' CHECK (mode IN ('water', 'fertigation'));
