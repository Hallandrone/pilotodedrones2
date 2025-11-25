-- Add mobile_image_url and desktop_only columns to ad_banners table
ALTER TABLE public.ad_banners
ADD COLUMN IF NOT EXISTS mobile_image_url TEXT,
ADD COLUMN IF NOT EXISTS desktop_only BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.ad_banners.mobile_image_url IS 'URL de la imagen del banner para dispositivos móviles (solo para posición Lateral Derecho)';
COMMENT ON COLUMN public.ad_banners.desktop_only IS 'Indica si el banner solo se muestra en desktop (true) o también tiene versión móvil (false)';


