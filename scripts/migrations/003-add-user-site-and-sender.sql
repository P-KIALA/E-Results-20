ALTER TABLE public.users ADD COLUMN IF NOT EXISTS site text;
ALTER TABLE public.send_logs ADD COLUMN IF NOT EXISTS sender_id uuid;
ALTER TABLE public.send_logs ADD COLUMN IF NOT EXISTS patient_site text;
ALTER TABLE public.send_logs ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.send_logs ALTER COLUMN patient_site DROP NOT NULL;
