-- Run this in your Supabase SQL Editor to add support for Videos and Live Classes

-- 13. Course Videos Table (YouTube Links)
CREATE TABLE IF NOT EXISTS public.course_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Live Classes Table (Zoom Links)
CREATE TABLE IF NOT EXISTS public.live_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  zoom_link TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Public for dev)
ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on course_videos" ON public.course_videos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on live_classes" ON public.live_classes FOR ALL USING (true) WITH CHECK (true);
