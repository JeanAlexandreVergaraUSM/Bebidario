# Mocktail Cloud

Recetario de **mocktails y bebidas sin alcohol** pensado para verse bien en celular y sincronizarse entre dispositivos.

## Stack

- React + TypeScript + Vite
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Deploy recomendado: Vercel

## Lo que incluye esta base

- registro e inicio de sesión con correo y contraseña
- CRUD de recetas
- CRUD de ingredientes reutilizables
- favoritos
- búsqueda por nombre, ingrediente y tags
- imágenes para recetas e ingredientes
- diseño mobile-first con navegación inferior en teléfono
- exportación JSON de respaldo
- ajuste de tamaño de texto

## Estructura

```txt
src/
  components/
  lib/
  pages/
  services/
  types/
  App.tsx
  main.tsx
  styles.css
supabase/
  schema.sql
```

## 1. Crear el proyecto en Supabase

Crea un proyecto y luego copia:

- Project URL
- anon public key

Guárdalas en un archivo `.env` basado en `.env.example`.

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 2. Ejecutar el esquema SQL

Abre el SQL Editor de Supabase y pega el contenido de `supabase/schema.sql`.

Ese archivo crea:

- tabla `recipes`
- tabla `ingredients`
- RLS por usuario autenticado
- buckets públicos para imágenes
- políticas mínimas para subir y leer imágenes

## 3. Instalar y correr localmente

```bash
npm install
npm run dev
```

## 4. Deploy recomendado

### Vercel

1. Sube este proyecto a GitHub.
2. Importa el repositorio en Vercel.
3. Configura las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy.

El archivo `vercel.json` ya deja la app lista para rutas SPA.

## 5. Buckets esperados

El frontend usa estos buckets:

- `recipe-images`
- `ingredient-images`

## 6. Mejoras recomendadas para la siguiente iteración

- historial de últimas vistas
- importación JSON
- perfiles con avatar
- etiquetas de colores
- listas compartidas entre 2 o más personas
- recetas públicas opcionales
- modo offline parcial

## Nota importante

Esta base está pensada para **bebidas sin alcohol**.
