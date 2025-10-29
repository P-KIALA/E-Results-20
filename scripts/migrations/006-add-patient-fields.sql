-- Add additional patient fields: sex, doctor, patient_ref, analyses

ALTER TABLE IF EXISTS public.patients
  ADD COLUMN IF NOT EXISTS sex text NULL,
  ADD COLUMN IF NOT EXISTS doctor text NULL,
  ADD COLUMN IF NOT EXISTS patient_ref text NULL,
  ADD COLUMN IF NOT EXISTS analyses jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_patients_patient_ref ON public.patients (patient_ref);
