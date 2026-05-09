# Bebidario

**Bebidario** es una web app visual para guardar, organizar y explorar bebidas, batidos y preparaciones frías en un solo lugar.

Diseñada para verse bien, sentirse moderna y facilitar el acceso a recetas con imágenes, ingredientes reutilizables y preparación paso a paso.

## ¿Qué es Bebidario?

Bebidario nace como una biblioteca personal de bebidas pensada para quienes quieren:

- guardar sus preparaciones favoritas
- crear nuevas bebidas con ingredientes propios
- reutilizar una biblioteca de ingredientes
- ver recetas de forma clara, visual y ordenada
- acceder desde distintos dispositivos

La idea es que cada bebida tenga su propia identidad: imagen, ingredientes, tiempos, dificultad, notas y presentación visual atractiva.

## Características principales

- Registro e inicio de sesión con Supabase
- Guardado en la nube por usuario
- Creación, edición y eliminación de bebidas
- Creación, edición y eliminación de ingredientes
- Favoritas
- Búsqueda por nombre, ingrediente o texto relacionado
- Imágenes para bebidas e ingredientes
- Vista detallada con ingredientes y pasos
- Interfaz visual, oscura y moderna
- Diseño responsive para computador y celular

## Enfoque del proyecto

Bebidario no busca ser solo una lista de recetas.

Busca ofrecer una experiencia más visual, más ordenada y más inspiradora, donde cada bebida se vea apetecible y fácil de entender desde el primer vistazo.

## Tecnologías utilizadas

- **React**
- **TypeScript**
- **Vite**
- **Supabase**
  - Auth
  - Database
  - Storage
- **CSS personalizado**

## Estructura general

```txt
src/
  components/
  pages/
  services/
  lib/
  types/
  App.tsx
  main.tsx
  styles.css

public/
supabase/
index.html
package.json
vite.config.ts
````

## Funcionalidades actuales

### Bebidas

* Crear bebidas nuevas
* Editar bebidas existentes
* Eliminar bebidas
* Ver detalle completo
* Marcar favoritas
* Añadir imagen
* Definir categoría, dificultad, tiempo y porciones
* Añadir ingredientes y pasos dinámicamente

### Ingredientes

* Crear ingredientes desde una biblioteca propia
* Editarlos o eliminarlos
* Asociarlos a distintas bebidas
* Reutilizarlos al momento de crear nuevas preparaciones
* Subir imagen referencial

### Experiencia de uso

* Interfaz limpia y visual
* Navegación clara
* Diseño oscuro elegante
* Accesible desde distintos tamaños de pantalla

## Instalación local

Clona el repositorio y entra al proyecto:

```bash
git clone https://github.com/JeanAlexandreVergaraUSM/Bebidario.git
cd Bebidario
```

Instala las dependencias:

```bash
npm install
```

Inicia el entorno de desarrollo:

```bash
npm run dev
```

Luego abre en el navegador la URL que entregue Vite, normalmente:

```txt
http://localhost:5173
```

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con estas variables:

```env
VITE_SUPABASE_URL=TU_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

## Configuración de base de datos

Dentro de la carpeta `supabase/` se incluye el archivo:

```txt
schema.sql
```

Ese archivo crea la estructura principal del proyecto en Supabase, incluyendo:

* tablas
* políticas de seguridad
* buckets de storage

Debes ejecutarlo en el **SQL Editor** de Supabase.

## Scripts disponibles

```bash
npm run dev
npm run build
npm run preview
```

## Publicación

Bebidario puede desplegarse como sitio web en servicios como:

* Vercel
* Netlify
* GitHub Pages

Para producción, se recomienda usar un entorno con soporte cómodo para variables de entorno y rutas del frontend.

## Estado actual

Proyecto funcional en desarrollo activo.

Actualmente permite gestionar bebidas e ingredientes desde una cuenta personal con almacenamiento en la nube y una interfaz ya utilizable.

## Próximas mejoras

* Mejoras de accesibilidad
* Mejor experiencia al editar ingredientes y pasos
* Más categorías de bebidas
* Mejoras visuales en tarjetas y detalle de recetas
* Filtros avanzados
* Más personalización de portada e imágenes
* Mejor experiencia móvil
* Exportación y respaldo más pulido

## Capturas y presentación

Bebidario está pensado para que cada receta sea visualmente atractiva, ordenada y fácil de consultar.
La aplicación prioriza una experiencia limpia, moderna y centrada en la exploración de bebidas.

## Autor

**Jean Alexandre Vergara**

Proyecto personal desarrollado como una web app moderna para organizar y presentar bebidas de forma visual, clara y reutilizable.

## Idea central

**Bebidario convierte una simple lista de recetas en una colección visual de bebidas que realmente dan ganas de preparar.**

```
