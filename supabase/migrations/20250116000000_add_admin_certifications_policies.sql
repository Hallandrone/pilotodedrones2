-- Add admin policies for user_certifications table
DROP POLICY IF EXISTS "Admins can view all certifications" ON public.user_certifications;
CREATE POLICY "Admins can view all certifications" 
ON public.user_certifications 
FOR SELECT 
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all certifications" ON public.user_certifications;
CREATE POLICY "Admins can update all certifications" 
ON public.user_certifications 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Add admin policies for user_subscriptions table
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can update all subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can insert subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Add admin policies for storage (to view all certification files)
DROP POLICY IF EXISTS "Admins can view all certification files" ON storage.objects;
CREATE POLICY "Admins can view all certification files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'certifications' AND public.is_admin(auth.uid()));

