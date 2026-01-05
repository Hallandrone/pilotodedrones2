# Script PowerShell para activar suscripción premium del usuario demo empresa
# Este script te guiará para ejecutar el SQL en el dashboard de Supabase

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ACTIVAR SUSCRIPCIÓN DEMO EMPRESA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abre tu navegador y ve a: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Selecciona tu proyecto" -ForegroundColor White
Write-Host "3. En el menú lateral, haz clic en 'SQL Editor'" -ForegroundColor White
Write-Host "4. Haz clic en 'New Query'" -ForegroundColor White
Write-Host "5. Copia y pega el siguiente SQL:" -ForegroundColor White
Write-Host ""

$sqlScript = @"
-- Activar suscripción premium para demo empresa
INSERT INTO user_subscriptions (
  user_id,
  plan_name,
  status,
  start_date,
  renewal_date,
  payment_provider
)
SELECT 
  id,
  'empresa',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month',
  'manual'
FROM profiles
WHERE email = 'demo@empresa.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  plan_name = 'empresa',
  status = 'active',
  start_date = NOW(),
  renewal_date = NOW() + INTERVAL '1 month',
  updated_at = NOW();

-- Verificar que funcionó
SELECT 
  p.email,
  p.user_type,
  us.plan_name,
  us.status,
  us.renewal_date
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.email = 'demo@empresa.com';
"@

Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host $sqlScript -ForegroundColor White
Write-Host "----------------------------------------" -ForegroundColor Green
Write-Host ""

# Copiar al portapapeles si está disponible
try {
    Set-Clipboard -Value $sqlScript
    Write-Host "✓ SQL copiado al portapapeles!" -ForegroundColor Green
    Write-Host "  Ahora solo pégalo (Ctrl+V) en el SQL Editor de Supabase" -ForegroundColor Cyan
} catch {
    Write-Host "⚠ No se pudo copiar al portapapeles automáticamente" -ForegroundColor Yellow
    Write-Host "  Copia manualmente el SQL de arriba" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "6. Haz clic en 'Run' o presiona Ctrl+Enter" -ForegroundColor White
Write-Host ""
Write-Host "RESULTADO ESPERADO:" -ForegroundColor Yellow
Write-Host "Deberías ver una tabla con:" -ForegroundColor White
Write-Host "  - email: demo@empresa.com" -ForegroundColor White
Write-Host "  - user_type: company" -ForegroundColor White
Write-Host "  - plan_name: empresa" -ForegroundColor White
Write-Host "  - status: active" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
