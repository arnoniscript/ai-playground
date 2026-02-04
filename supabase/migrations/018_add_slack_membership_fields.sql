-- Add Slack integration fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS slack_connected boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS slack_checked_at timestamptz;
