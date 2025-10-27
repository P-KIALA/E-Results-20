ALTER TABLE public.send_logs ADD COLUMN IF NOT EXISTS patient_name text;
ALTER TABLE public.send_logs ALTER COLUMN patient_name DROP NOT NULL;
