-- Agregar campos faltantes para filtros de búsqueda de pilotos

-- Agregar columna drone_types a la tabla profiles si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'drone_types') THEN
    ALTER TABLE profiles ADD COLUMN drone_types text[];
    COMMENT ON COLUMN profiles.drone_types IS 'Tipos de drones que el piloto puede operar';
  END IF;
END $$;

-- Agregar columna certification_academy a la tabla pilots si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pilots' AND column_name = 'certification_academy') THEN
    ALTER TABLE pilots ADD COLUMN certification_academy text;
    COMMENT ON COLUMN pilots.certification_academy IS 'Academia que certificó al piloto';
  END IF;
END $$;