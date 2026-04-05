-- Migration: Make timezone nullable with NULL as "never explicitly set" sentinel
ALTER TABLE public.user_preferences
  ALTER COLUMN timezone DROP NOT NULL,
  ALTER COLUMN timezone SET DEFAULT NULL;

UPDATE public.user_preferences SET timezone = NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_timezone_not_empty'
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_timezone_not_empty
      CHECK (timezone IS NULL OR timezone <> '');
  END IF;
END $$;
