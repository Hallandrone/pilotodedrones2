# Archivos maestros de diseño

Esta carpeta no se publica (Vite solo sirve `public/`).

- `DIPLOMA_2026-600ppp.jpg`: fondo del diploma en su resolución original (7795×5102 px, 600 ppp, 9,7 MB).
  El sitio usa `public/DIPLOMA_2026-300ppp.jpg`, una versión a 300 ppp (3898×2551 px, calidad JPEG 95, ~1,1 MB)
  porque `@react-pdf/renderer` incrusta el JPEG tal cual en cada diploma y con el original cada PDF pesaba 9,3 MB.
  El límite acordado es que ningún diploma generado supere los 3 MB.

Ojo con la caché: `vercel.json` sirve los JPG de `public/` con `Cache-Control: immutable` por un año, así que si se
regenera el fondo hay que publicarlo con un **nombre de archivo nuevo** y actualizar las referencias en
`src/components/DiplomaPDF.tsx`, `src/pages/DiplomaGenerator.tsx` y `src/pages/PublicPilotProfile.tsx`; de lo contrario
los navegadores que ya lo tenían seguirán usando la versión antigua.

Para regenerar el fondo publicado a partir del maestro:

```bash
sips -s format jpeg -s formatOptions 95 --resampleWidth 3898 -s dpiWidth 300 -s dpiHeight 300 design/DIPLOMA_2026-600ppp.jpg --out public/DIPLOMA_2026-300ppp.jpg
```
