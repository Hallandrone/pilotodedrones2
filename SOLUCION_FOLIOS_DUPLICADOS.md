# Solución para Folios Duplicados en Diplomas

## Problema Identificado
Los diplomas se estaban generando con el mismo número correlativo (folio) porque:
1. El número correlativo se calculaba pero **no se guardaba en la base de datos**
2. El sistema solo mostraba el número en la vista previa, pero no lo persistía

## Cambios Implementados

### 1. Código Actualizado ✅
- **Archivo**: `DiplomaGenerator.tsx`
- **Cambio**: Se agregó `correlative_number: correlativeNumber` al insert de diplomas
- **Línea**: 111-112

Ahora cada diploma guarda su número correlativo en la base de datos.

### 2. Migración de Base de Datos ⚠️ REQUIERE ACCIÓN MANUAL

**IMPORTANTE**: Debes ejecutar la migración SQL para agregar la columna a la base de datos.

#### Pasos para ejecutar la migración:

1. **Ve a Supabase Dashboard**:
   - https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**:
   - En el menú lateral, click en "SQL Editor"
   - Click en "New Query"

3. **Copia y pega el contenido del archivo**:
   - `migration_add_correlative_number.sql`

4. **Ejecuta la migración**:
   - Click en "Run" o presiona Ctrl+Enter

#### ¿Qué hace la migración?

1. **Agrega la columna** `correlative_number` a la tabla `diplomas`
2. **Actualiza registros existentes**: Asigna números correlativos a todos los diplomas ya creados, basándose en su fecha de creación + 14600
3. **Mantiene consistencia**: Los nuevos diplomas automáticamente guardarán su número correlativo

## Verificación

Después de ejecutar la migración:

1. **Verifica en Supabase**:
   ```sql
   SELECT id, student_name, correlative_number, created_at 
   FROM diplomas 
   ORDER BY correlative_number;
   ```

2. **Prueba crear un nuevo diploma**:
   - El número correlativo debe ser único
   - Debe incrementar automáticamente con cada diploma nuevo
   - Debe guardarse en la base de datos

## Regenerar TypeScript Types (Opcional pero Recomendado)

Después de agregar la columna, es buena práctica regenerar los types:

```bash
npx supabase gen types typescript --project-id nmxgdgdttgcokjvmvuvr > src/integrations/supabase/types.ts
```

## Resumen

✅ **Cambios en código**: Completados
⚠️ **Migración de base de datos**: Requiere ejecución manual en Supabase Dashboard
📝 **Archivo de migración**: `migration_add_correlative_number.sql`

Una vez ejecutada la migración, el problema de folios duplicados estará completamente resuelto.
