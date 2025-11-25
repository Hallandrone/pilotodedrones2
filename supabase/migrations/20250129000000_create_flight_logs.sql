-- Create flight_logs table to store uploaded flight log files (vitacoras)
CREATE TABLE public.flight_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES auth.users(id),
  rejection_observations TEXT,
  flight_hours NUMERIC(10, 2), -- Hours extracted/validated from the log
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for flight_logs - Users can manage their own logs
CREATE POLICY "Users can view their own flight logs" 
ON public.flight_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flight logs" 
ON public.flight_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flight logs" 
ON public.flight_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flight logs" 
ON public.flight_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin policies for flight_logs
CREATE POLICY "Admins can view all flight logs" 
ON public.flight_logs 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all flight logs" 
ON public.flight_logs 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_flight_logs_updated_at
BEFORE UPDATE ON public.flight_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for flight log files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('flight-logs', 'flight-logs', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for flight log files
-- Users can upload their own flight log files
CREATE POLICY "Users can upload their own flight log files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'flight-logs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own flight log files
CREATE POLICY "Users can view their own flight log files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'flight-logs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own flight log files
CREATE POLICY "Users can delete their own flight log files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'flight-logs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all flight log files
CREATE POLICY "Admins can view all flight log files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'flight-logs' AND 
  public.is_admin(auth.uid())
);

-- Enable Realtime for flight_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.flight_logs;

-- Add comments for documentation
COMMENT ON TABLE public.flight_logs IS 'Tabla para almacenar vitacoras de vuelo subidas por los pilotos';
COMMENT ON COLUMN public.flight_logs.flight_hours IS 'Horas de vuelo validadas extraídas de la vitacora';
COMMENT ON COLUMN public.flight_logs.rejection_observations IS 'Observaciones del administrador al rechazar la vitacora';
COMMENT ON COLUMN public.flight_logs.validated_by IS 'ID del administrador que validó la vitacora';

