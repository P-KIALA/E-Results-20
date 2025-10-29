-- Add is_collector column to users and create sample_queue table
-- Ensure pgcrypto extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_collector boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.sample_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  collector_id uuid NULL,
  status text NOT NULL DEFAULT 'waiting',
  eta timestamptz NULL,
  notes text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sample_queue_status ON public.sample_queue(status);
CREATE INDEX IF NOT EXISTS idx_sample_queue_collector ON public.sample_queue(collector_id);
