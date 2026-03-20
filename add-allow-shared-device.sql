-- Add allow_shared_device column to quiz_sessions
-- Controls whether students can create shared-device teams
-- Default is false; teacher enables it when starting a team mode quiz

ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS allow_shared_device BOOLEAN DEFAULT false;
