# Publicar Sabor a Hogar en GitHub Pages

1. Subí los cambios al repositorio, incluyendo `.github/workflows/deploy-pages.yml`. El workflow publica al recibir cambios en `main` o al ejecutarlo manualmente desde Actions.
2. En GitHub, abrí **Settings → Pages → Build and deployment → Source** y seleccioná **GitHub Actions**.
3. En **Settings → Secrets and variables → Actions → Variables**, creá estas variables de repositorio con los valores del `.env` local:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PRODUCTOS_BUCKET` (opcional; por defecto `productos`).
4. Desde **Actions → Publicar en GitHub Pages → Run workflow**, seleccioná `main` y ejecutalo. Las publicaciones posteriores serán automáticas al actualizar esa rama.
5. Cuando termine correctamente, abrí https://AlexisNovello.github.io/Sabor_a_Hogar/.

Se publica solamente `dist`, después de instalar dependencias, ejecutar las pruebas y compilar. El `.env` sigue excluido de Git. Las variables `VITE_` se incorporan al JavaScript público: usá exclusivamente la clave pública de Supabase, nunca una clave `service_role` ni una clave secreta. Los permisos efectivos dependen de las políticas de Supabase.

## Supabase Auth

En **Authentication → URL Configuration**, configurá el Site URL como `https://AlexisNovello.github.io/Sabor_a_Hogar/`. Agregá a Redirect URLs `https://AlexisNovello.github.io/Sabor_a_Hogar/login.html` y conservá `http://localhost:5173/**` si seguís probando localmente. El registro solicita como destino de confirmación el login del entorno desde el que se creó la cuenta.

La publicación no ejecuta los archivos de `supabase/migrations` ni modifica la base, los buckets o sus políticas. Aplicá por separado los SQL que correspondan. Los usuarios y pedidos son los del proyecto Supabase configurado, también al probar la web publicada.

## Probar la compilación de Pages localmente

En PowerShell:

```powershell
$env:VITE_BASE_PATH = '/Sabor_a_Hogar/'
npm run build
npm run preview
```

Abrí la URL del servidor de preview con `/Sabor_a_Hogar/` al final. Para volver a compilar para la raíz:

```powershell
Remove-Item Env:VITE_BASE_PATH
```

El servidor `npm run dev` usa la raíz de forma predeterminada. Antes de presentar, comprobá login, confirmación de correo, catálogo, carrito, creación de pedidos, Mis pedidos y acceso con los roles `admin` y `cocina`.
