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

Catálogo conectado a Supabase, carrito persistido en el navegador, creación de pedidos mediante la función `crear_pedido`, comandas y gestión de stock. Se recuperaron el registro, login y cierre de sesión de la rama `autenticacion`, adaptados al flujo actual.

## Autenticación y pedidos

- La carta es pública. El enlace **Ingresar** abre `/login.html`, que permite acceder al registro de dos pasos en `/registro.html`.
- Al confirmar un carrito sin sesión se abre el login; después de ingresar se vuelve al carrito con sus productos. El cliente debe confirmar nuevamente: iniciar sesión no crea un pedido automáticamente.
- Antes de llamar a `crear_pedido`, se verifica el usuario con Supabase Auth. Se mantiene el contrato actual: `{ productos: [{ id_producto, cantidad }] }`. Los precios no se envían desde el navegador.
- El cierre de sesión conserva el carrito de este navegador. El carrito no está separado por cuenta; en dispositivos compartidos, revisá sus productos antes de confirmar.
- Las rutas antiguas `/contraseña.html` y `/registrocliente.html` redirigen a las nuevas pantallas.
- La compilación incluye todas las páginas HTML de la raíz. El flujo de pedidos sigue usando retiro en el local; delivery continúa pendiente.

### Configuración pendiente de verificar en Supabase

El repositorio no contiene el esquema SQL ni migraciones. El registro envía nombre, apellido, DNI, teléfono y dirección como metadata a Supabase Auth; la creación del perfil en `public.usuario` depende del trigger existente en la base de datos. Hay que verificar que sus columnas y el vínculo con `auth.users.id` sean compatibles.

En Authentication, verificá que el proveedor Email esté habilitado, la confirmación de correo tenga la configuración deseada y las URL del sitio y de redirección correspondan al entorno donde se prueba o publica.

La función `crear_pedido` debe obtener la identidad desde `auth.uid()`, rechazar visitantes y asociar el pedido con su usuario. También debe validar cantidades, precios y stock en el servidor. Las políticas RLS y permisos deben limitar la lectura y modificación de pedidos, stock y administración según el rol. La comprobación de sesión del frontend no reemplaza esos permisos. No se modificó la base de datos ni se añadieron controles de roles administrativos sin conocer su esquema.

## Verificación

```bash
npm test
npm run build
```

Las pruebas usan dobles de Supabase, sin conectarse a la base. Cubren autenticación requerida, contrato de pedidos, errores de conexión, metadata de registro y destinos del login. Para verificar el entorno real: registrar una cuenta de prueba, confirmar su correo si corresponde, iniciar y cerrar sesión y confirmar un carrito; comprobar tanto el perfil creado como el usuario asociado al pedido en Supabase. Probar también credenciales incorrectas, sesión vencida y permisos de cada rol.
