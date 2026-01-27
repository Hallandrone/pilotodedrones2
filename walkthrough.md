# Sistema de Asociación y Verificación de Diplomas mediante QR

He implementado las mejoras solicitadas para el flujo de escaneo de QR en los diplomas. El sistema ahora distingue entre diplomas no asociados y asociados, guiando al alumno en el proceso de registro o login.

## Cambios Realizados

### 1. Nuevo Flujo de Redirección (QRRedirect)
Cuando un alumno escanea el código QR de un diploma por primera vez:
- Se le pregunta explícitamente si ya tiene una cuenta o si es un usuario nuevo.
- Dependiendo de su elección, se le redirige a la pestaña correspondiente de **Iniciar Sesión** o **Registrarse**.
- Si el diploma ya está asociado, se le redirige automáticamente a la página de **Verificación de Diploma**.

### 2. Asociación Automática (Auth)
- Al iniciar sesión o registrarse con un token de QR pendiente, el sistema asocia automáticamente el diploma al perfil del usuario.
- Tras la asociación exitosa, el alumno es redirigido a la página de verificación para confirmar que su nombre y perfil están correctamente vinculados.

### 3. Verificación con Enlace al Perfil (DiplomaVerification)
- La página de verificación ahora detecta si un diploma pertenece a un usuario registrado.
- Se ha añadido un botón destacado: **"Ver perfil profesional de [Nombre]"**.
- Esto permite que cualquier tercero que escanee el diploma pueda validar no solo el documento, sino también el perfil oficial del piloto en la plataforma.

### 4. Visualización en Perfil Público
- He añadido una nueva sección **"Capacitaciones y Diplomas"** en el perfil público del piloto.
- Los diplomas asociados aparecen automáticamente con un diseño premium.
- Al pasar el ratón (hover) sobre un diploma, aparece la opción **"Verificar en línea"**, que lleva directamente al validador oficial.


## Verificación del Flujo

| Paso | Acción | Resultado Esperado |
| :--- | :--- | :--- |
| **1** | Escanear QR no asociado | Aparece modal preguntando "Ya tengo cuenta" / "Soy nuevo". |
| **2** | Seleccionar "Soy nuevo" | Redirige a Registro con el token guardado. |
| **3** | Completar registro | Muestra toast de "Diploma asociado" y redirige a Verificación. |
| **4** | Página de Verificación | Muestra datos del diploma y botón para "Ver perfil". |
| **5** | Escanear QR ya asociado | Redirige directo a Verificación (pasando por el validador). |

---
> [!NOTE]
> Este sistema garantiza que los diplomas impresos (cuentas fantasmas) se vinculen correctamente a la identidad digital del alumno en su primera interacción.
