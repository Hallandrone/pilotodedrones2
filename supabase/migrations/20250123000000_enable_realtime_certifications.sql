-- Enable Realtime for user_certifications table
-- This allows the frontend to listen to changes in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_certifications;

