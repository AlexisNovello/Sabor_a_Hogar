# Sabor a Hogar

Proyecto académico de una aplicación web para consultar el menú y gestionar pedidos de comida casera.

## Tecnologías

HTML, JavaScript, Tailwind CSS y Vite. Supabase para la base de datos.

## Ejecutar el proyecto

Necesitás Node.js y npm instalados. Desde la carpeta que contiene `package.json`:

```bash
npm install
```

Copiá `.env.example` como `.env` en esa misma carpeta y completá:

- `VITE_SUPABASE_URL`: URL del proyecto de Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: clave pública del proyecto.

Pedile estos valores al equipo. No uses claves secretas ni `service_role` en el frontend. El archivo `.env` está excluido de Git; `.env.example` se comparte como plantilla.

Luego iniciá el servidor de desarrollo:

```bash
npm run dev
```

Abrí en el navegador la dirección que indique la terminal.
Si modificás `.env`, reiniciá el servidor.

## Compilar

```bash
npm run build
```

Vite prepara y optimiza los archivos para publicar en `dist/`. Este comando no sube la web a Internet ni modifica la base de datos. Una compilación exitosa no garantiza que funcionen las consultas o los permisos de Supabase: también hay que probar la aplicación.

Para revisar esa compilación localmente:

```bash
npm run preview
```

## Estructura principal

- `index.html`: página principal.
- `src/main.js`: entrada de JavaScript.
- `src/style.css`: estilos e importación de Tailwind.
- `src/lib/supabase.js`: configuración del cliente de Supabase.
- `src/services/productos.js`: consulta de productos.
- `public/`: recursos estáticos.

## Trabajo en equipo

Antes de comenzar una funcionalidad, actualizá `main` con tus cambios locales guardados y creá una rama propia:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/nombre-de-la-tarea
```

Reemplazá `nombre-de-la-tarea` por una descripción breve, por ejemplo `catalogo`. Compartí los cambios mediante un pull request hacia `main` y comprobá que la aplicación funcione antes de integrarlos.

No subas `.env`, `node_modules/` ni `dist/`. Sí se comparten `package.json`, `package-lock.json` y `.env.example`.

## Estado actual

Base de Vite y Tailwind configurada. La consulta a la tabla `producto` de Supabase fue probada y muestra los resultados en la consola del navegador. La presentación visual del catálogo está pendiente.
