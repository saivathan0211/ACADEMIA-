-- Migration to fix course creation and notification sync

-- 1. Add missing columns to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Mandatory';

-- 2. Sync notifications table with frontend code
-- Frontend uses 'content', but schema used 'title' and 'message'
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS content TEXT;

-- Optional: Copy old message data to content if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='message') THEN
        UPDATE public.notifications SET content = message WHERE content IS NULL;
    END IF;
END $$;
