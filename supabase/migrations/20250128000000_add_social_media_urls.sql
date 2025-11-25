-- Agregar campos para URLs completas de redes sociales
-- Mantener los campos username como respaldo para compatibilidad

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Agregar comentarios para documentación
COMMENT ON COLUMN public.profiles.instagram_url IS 'URL completa de Instagram (ej: https://instagram.com/usuario). Si está presente, tiene prioridad sobre instagram_username';
COMMENT ON COLUMN public.profiles.linkedin_url IS 'URL completa de LinkedIn (ej: https://linkedin.com/in/usuario). Si está presente, tiene prioridad sobre linkedin_username';

-- Migrar datos existentes: construir URLs desde usernames si no hay URLs
UPDATE public.profiles
SET 
  instagram_url = CASE 
    WHEN instagram_username IS NOT NULL AND instagram_username != '' 
    THEN 'https://instagram.com/' || instagram_username 
    ELSE NULL 
  END,
  linkedin_url = CASE 
    WHEN linkedin_username IS NOT NULL AND linkedin_username != '' 
    THEN 'https://linkedin.com/in/' || linkedin_username 
    ELSE NULL 
  END
WHERE (instagram_username IS NOT NULL OR linkedin_username IS NOT NULL)
  AND (instagram_url IS NULL AND linkedin_url IS NULL);

