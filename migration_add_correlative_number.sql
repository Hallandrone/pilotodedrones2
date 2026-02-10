-- Migración: Agregar correlative_number a diplomas
-- Fecha: 2026-02-10
-- Descripción: Soluciona el problema de folios duplicados agregando una columna
--              para almacenar el número correlativo de cada diploma

-- Paso 1: Agregar la columna correlative_number
ALTER TABLE diplomas 
ADD COLUMN IF NOT EXISTS correlative_number INTEGER;

-- Paso 2: Actualizar los registros existentes con sus números correlativos
-- Calculado basándose en su orden de creación + 14600
WITH numbered_diplomas AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) + 14599 as new_correlative
  FROM diplomas
  WHERE correlative_number IS NULL
)
UPDATE diplomas
SET correlative_number = numbered_diplomas.new_correlative
FROM numbered_diplomas
WHERE diplomas.id = numbered_diplomas.id;

-- Verificación: Ver los números correlativos asignados
-- SELECT id, student_name, correlative_number, created_at 
-- FROM diplomas 
-- ORDER BY created_at;
