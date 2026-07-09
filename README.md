# SIAU · Sistema de Información y Atención al Usuario

App consolidada de CAC Santa Bárbara que unifica en un solo lugar:

- **Reporte** → Registrar PQRSF (antes `pqrsf-reporte`)
- **Respuesta** → Responder PQRSF (antes `pqrsf-respuesta`)
- **Consola** → Gestión PQRSF (antes `pqrsf-consola`) y Gestión Satisfacción (antes `satisfaccion`)
- **Análisis** → Dashboard, Reportes, Mapa de Calor PQRSF, Mapa de Calor Satisfacción
- **Administrador** → Usuarios, Tablas maestras (Resumen, Colores mapa de calor)

## URLs

| App | URL |
|-----|-----|
| **SIAU** | https://juanetayo-projects.github.io/siau/ |

Las 4 apps originales (`pqrsf-reporte`, `pqrsf-respuesta`, `pqrsf-consola`, `satisfaccion`) siguen activas en paralelo mientras se valida y completa esta consolidación.

## Backend

Un único proyecto Supabase (compartido con las apps de PQRSF): `cdarbygwhtwkdgkelktw`. Las tablas y datos de Satisfacción (`satisfaccion_respuestas`, `profiles`) fueron portados desde el proyecto `ycbzchoclantbkjglfvn`. Roles y permisos unificados en `consola_perfiles` (`rol` + `modulos[]`).

## Stack

React 19 + Vite 6 + TypeScript + Tailwind v4 · Supabase (Auth + RLS) · ECharts · ExcelJS/pdfmake. Branding azul institucional `#0D2D6B` / `#16468E`.

## Desarrollo

```bash
npm install
cp .env.example .env   # completar VITE_SUPABASE_ANON_KEY
npm run dev
```

## Estado

Proyecto en construcción por fases. El menú, login, roles/permisos y "Colores mapa de calor" ya son nativos; el resto de módulos muestran una pantalla "en construcción" mientras se portan desde sus apps originales.
