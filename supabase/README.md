# SQL de Supabase

## Estado versionado

- `snapshots/2026-11-14/`: definiciones reales compartidas desde Supabase en esta conversación: tres funciones públicas, `private.es_admin()`, trigger de registro, políticas RLS y permisos observados. Es una referencia del estado observado antes de aplicar las migraciones de permisos, no una copia consultada en vivo.
- `migrations/`: cambios ordenados sobre una base existente. No crean la base desde cero y no se ejecutan al publicar la web.
- `consultas/exportar_estado.sql`: consulta de solo lectura para volver a exportar estructura, funciones, triggers, políticas y permisos sin incluir usuarios ni pedidos.

## Migraciones existentes

1. `202611010001_vincular_pedido_cliente.sql`: versión histórica de pedidos. No ejecutar aisladamente sobre una base actual: reemplaza la función con una versión anterior.
2. `202611140001_rechazar_pedidos_cuentas_bloqueadas.sql`: conserva la función real recibida, incluidos publicación, recetas, bloqueo y descuento transaccional de stock.
3. `202611140002_restringir_permisos.sql`: propuesta de permisos para administrador, cocina, clientes y visitantes. Su aplicación en Supabase no está confirmada en este repositorio.

Los snapshots son documentación; no ejecutar todos los archivos SQL indiscriminadamente. Revisar el estado remoto y aplicar únicamente las migraciones pendientes en orden.

## Cómo actualizar el snapshot

1. Ejecutar `consultas/exportar_estado.sql` en Supabase → SQL Editor.
2. Exportar el resultado y guardar el JSON de la columna `estado` en `snapshots/AAAA-MM-DD/estado.json`.
3. Agregar las modificaciones de la base como una nueva migración; no sobrescribir migraciones ya aplicadas.
4. Probar con cuentas de cada rol, no solo desde SQL Editor, y versionar los archivos junto con el código.

## Límites de la copia inicial

Todavía faltan las definiciones completas de tablas: longitudes, precisión numérica, PK, FK, CHECK, índices, identidades/secuencias y sus permisos. Las columnas compartidas no alcanzan para reconstruir fielmente una base vacía. Tampoco se exportaron Storage, proveedores y configuración de Auth, extensiones ni secretos. La consulta incluida permite obtener más detalle sin inventar estas definiciones.
