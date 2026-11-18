# Sabor a Hogar

Proyecto académico de una aplicación web para consultar el menú y gestionar pedidos de comida casera.

## Tecnologías

HTML, JavaScript, Tailwind CSS y Vite. Supabase para la base de datos, autenticación y almacenamiento de imágenes.

## Obtener el proyecto

Para descargar el código desde GitHub:

```bash
git clone https://github.com/AlexisNovello/Sabor_a_Hogar.git
cd Sabor_a_Hogar
```

También se puede descargar el repositorio como archivo ZIP y abrir la carpeta extraída en una terminal.

## Requisitos

- Node.js 24 o una versión compatible y npm.
- Conexión a Internet para instalar dependencias y conectarse a Supabase.
- Acceso a los valores públicos de configuración de Supabase provistos por el equipo.

## Instalar y ejecutar el proyecto

Desde la carpeta que contiene `package.json`, instalá las dependencias:

```bash
npm install
```

Copiá `.env.example` como `.env` en esa misma carpeta y completá:

- `VITE_SUPABASE_URL`: URL del proyecto de Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: clave pública del proyecto.
- `VITE_SUPABASE_PRODUCTOS_BUCKET`: nombre del bucket público de imágenes. Si no se modifica, se utiliza `productos`.

Pedile estos valores al equipo. No uses claves secretas ni `service_role` en el frontend. El archivo `.env` está excluido de Git; `.env.example` se comparte como plantilla.

Luego iniciá el servidor de desarrollo:

```bash
npm run dev
```

Abrí en el navegador la dirección que indique la terminal. Si modificás `.env`, reiniciá el servidor.

## Compilar

```bash
npm run build
```

Vite prepara y optimiza los archivos para publicar en `dist/`. Este comando no sube la web a Internet ni modifica la base de datos.

Para revisar la compilación localmente:

```bash
npm run preview
```

## Estructura principal

- `index.html`: página principal.
- `src/main.js`: entrada principal de JavaScript.
- `src/style.css`: estilos e importación de Tailwind.
- `src/lib/supabase.js`: configuración del cliente de Supabase.
- `src/services/`: servicios para productos, pedidos, stock, usuarios y recetas.
- `public/`: recursos estáticos.
- `supabase/`: migraciones, consultas y documentación de la base de datos.

## Documentación

- [Configuración de Supabase](supabase/README.md): describe el SQL, las migraciones y la configuración necesaria de la base de datos.
- El manual de usuario, las preguntas frecuentes y la documentación académica del proyecto se presentan por separado junto con la entrega final.
  
## Trabajo en equipo

Antes de comenzar una funcionalidad, actualizá `main` con tus cambios locales guardados y creá una rama propia:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/nombre-de-la-tarea
```

Reemplazá `nombre-de-la-tarea` por una descripción breve, por ejemplo `catalogo`. Compartí los cambios mediante un pull request hacia `main` y comprobá que la aplicación funcione antes de integrarlos.

No subas `.env`, `node_modules/` ni `dist/`. Sí se comparten `package.json`, `package-lock.json`, `.env.example` y los archivos de documentación.

## Estado actual

La aplicación permite consultar la carta, registrarse, confirmar el correo, iniciar sesión y crear pedidos para retirar en el local. También incluye carrito persistido en el navegador, comandas para cocina, gestión de platos y recetas, control de stock y bloqueo de cuentas desde administración.

## Autenticación y pedidos

- La carta es pública. El enlace **Ingresar** abre `/login.html`, que permite acceder al registro de dos pasos en `/registro.html`.
- Al confirmar un carrito sin sesión se abre el login. Después de ingresar se vuelve al carrito con sus productos y el cliente debe confirmar nuevamente.
- Antes de llamar a `crear_pedido`, se verifica el usuario con Supabase Auth. El navegador solo envía los productos y cantidades; los precios no se envían desde el navegador.
- El cierre de sesión conserva el carrito de este navegador. El carrito no está separado por cuenta; en dispositivos compartidos se recomienda revisar los productos antes de confirmar.
- Las pantallas de acceso actuales son `login.html` y `registro.html`.
- La única modalidad de pedido implementada es el retiro en el local.

### Configuración de Supabase

El SQL y las migraciones están documentados en [supabase/README.md](supabase/README.md). La configuración exportada y revisada confirmó RLS en las seis tablas y permisos restringidos por rol.

El trigger de registro crea el perfil vinculado a Supabase Auth con rol cliente. La función `crear_pedido` obtiene la identidad desde `auth.uid()`, rechaza visitantes y cuentas bloqueadas, calcula los precios en la base de datos y descuenta el stock dentro de una transacción.

Se realizaron pruebas manuales con cuentas de los roles cliente, cocina y administrador, verificando el circuito principal de pedidos, comandas, stock y administración.

Para publicar correctamente, Supabase debe conservar el proveedor Email habilitado, la confirmación de correo y las URL del sitio y de redirección correspondientes al entorno publicado.

## Verificación

Para ejecutar las pruebas automatizadas:

```bash
npm test
```

Para generar la compilación de producción:

```bash
npm run build
```

Las pruebas automatizadas usan dobles de Supabase, sin conectarse a la base de datos real. Cubren autenticación requerida, contrato de pedidos, errores de conexión, metadata de registro y destinos del login.

Como verificación manual del entorno real, se probó el registro, la confirmación de correo, el inicio y cierre de sesión, la confirmación de un carrito, las comandas, el stock y los permisos de cliente, cocina y administración.

Antes de una nueva publicación se recomienda repetir este recorrido y comprobar credenciales incorrectas, sesión vencida y permisos de cada rol.
