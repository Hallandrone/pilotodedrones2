-- Add metadata fields to flight_logs for detailed records
ALTER TABLE public.flight_logs
  ADD COLUMN IF NOT EXISTS flight_date DATE,
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure existing records have sensible defaults
UPDATE public.flight_logs
SET flight_date = COALESCE(flight_date, (uploaded_at)::date),
    duration_hours = COALESCE(duration_hours, NULL);
