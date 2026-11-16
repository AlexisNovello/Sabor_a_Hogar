# SQL de Supabase

## Estado versionado

- `snapshots/2026-11-14/`: definiciones reales compartidas desde Supabase en esta conversación: tres funciones públicas, `private.es_admin()`, trigger de registro, políticas RLS y permisos observados. Es una referencia del estado observado antes de aplicar las migraciones de permisos, no una copia consultada en vivo.
- `migrations/`: cambios ordenados sobre una base existente. No crean la base desde cero y no se ejecutan al publicar la web.
- `consultas/exportar_estado.sql`: consulta de solo lectura para volver a exportar estructura, funciones, triggers, políticas y permisos sin incluir usuarios ni pedidos.

## Migraciones existentes

1. `202611010001_vincular_pedido_cliente.sql`: versión histórica de pedidos. No ejecutar aisladamente sobre una base actual: reemplaza la función con una versión anterior.
2. `202611140001_rechazar_pedidos_cuentas_bloqueadas.sql`: conserva la función real recibida, incluidos publicación, recetas, bloqueo y descuento transaccional de stock.
3. `202611140002_restringir_permisos.sql`: permisos para administrador, cocina, clientes y visitantes. La exportación del 15 de noviembre de 2026 confirma una configuración coherente con esta migración; no hace falta volver a ejecutarla por la advertencia del snapshot anterior.

4. `202611150001_validar_transiciones_pedido.sql`: valida los avances de estado de pedidos.
5. `202611150002_ajustar_storage_productos.sql`: permite subir y limpiar fotos a administradores activos en el bucket productos.

Los snapshots son documentación; no ejecutar todos los archivos SQL indiscriminadamente. Revisar el estado remoto y aplicar únicamente las migraciones pendientes en orden.

## Cómo actualizar el snapshot

1. Ejecutar `consultas/exportar_estado.sql` en Supabase → SQL Editor.
2. Exportar el resultado y guardar el JSON de la columna `estado` en `snapshots/AAAA-MM-DD/estado.json`.
3. Agregar las modificaciones de la base como una nueva migración; no sobrescribir migraciones ya aplicadas.
4. Probar con cuentas de cada rol, no solo desde SQL Editor, y versionar los archivos junto con el código.

## Límites de las exportaciones

La exportación del 15 de noviembre incorpora longitudes, precisión numérica, PK, FK, CHECK, índices, identidades/secuencias y permisos que faltaban en la copia inicial. Todavía no hay un script de instalación desde cero probado. No se exportaron Storage, proveedores y configuración de Auth, extensiones, roles personalizados/herencia ni secretos. No ejecutar el snapshot como una migración.
