-- Migration: Add damaged components columns to movements table
-- Run this in Supabase SQL editor or via psql using your DB connection string.

ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS damaged_components text;

ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS damaged_component_other text;
