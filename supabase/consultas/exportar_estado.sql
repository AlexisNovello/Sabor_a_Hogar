-- Solo lectura. Devuelve una fila con una columna JSON: estado.
-- No consulta el contenido de usuario, pedido, auth.users ni otras tablas de negocio.
WITH tablas AS (
  SELECT c.oid, n.nspname AS esquema, c.relname AS nombre,
    c.relrowsecurity AS rls, c.relforcerowsecurity AS forzar_rls,
    pg_get_userbyid(c.relowner) AS propietario, c.relacl::text AS permisos
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
), columnas AS (
  SELECT t.nombre AS tabla, a.attnum AS posicion, a.attname AS nombre,
    format_type(a.atttypid, a.atttypmod) AS tipo,
    a.attnotnull AS no_nulo, a.attidentity AS identidad,
    a.attgenerated AS generado, a.attacl::text AS permisos,
    pg_get_expr(d.adbin, d.adrelid) AS valor_predeterminado
  FROM tablas t JOIN pg_attribute a ON a.attrelid = t.oid
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attnum > 0 AND NOT a.attisdropped
), restricciones AS (
  SELECT t.nombre AS tabla, c.conname AS nombre,
    pg_get_constraintdef(c.oid, true) AS definicion
  FROM tablas t JOIN pg_constraint c ON c.conrelid = t.oid
), funciones AS (
  SELECT n.nspname AS esquema, p.proname AS nombre,
    pg_get_function_identity_arguments(p.oid) AS argumentos,
    pg_get_userbyid(p.proowner) AS propietario, p.proacl::text AS permisos,
    pg_get_functiondef(p.oid) AS definicion
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'private') AND p.prokind IN ('f', 'p')
), triggers AS (
  SELECT n.nspname AS esquema, c.relname AS tabla, t.tgname AS nombre,
    t.tgenabled AS habilitado, pg_get_triggerdef(t.oid, true) AS definicion,
    pg_get_functiondef(t.tgfoid) AS funcion
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal
    AND (n.nspname = 'public' OR (n.nspname = 'auth' AND c.relname = 'users'))
), secuencias AS (
  SELECT s.*, c.relacl::text AS permisos
  FROM pg_sequences s JOIN pg_namespace n ON n.nspname = s.schemaname
  JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = s.sequencename
  WHERE s.schemaname = 'public'
), esquemas AS (
  SELECT nspname AS nombre, pg_get_userbyid(nspowner) AS propietario,
    nspacl::text AS permisos FROM pg_namespace WHERE nspname IN ('public', 'private')
)
SELECT jsonb_build_object(
  'exportado_en', now(),
  'tablas', COALESCE((SELECT jsonb_agg(to_jsonb(t) - 'oid' ORDER BY nombre) FROM tablas t), '[]'::jsonb),
  'columnas', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY tabla, posicion) FROM columnas c), '[]'::jsonb),
  'restricciones', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY tabla, nombre) FROM restricciones r), '[]'::jsonb),
  'indices', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY tablename, indexname) FROM pg_indexes i WHERE schemaname = 'public'), '[]'::jsonb),
  'funciones', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY esquema, nombre, argumentos) FROM funciones f), '[]'::jsonb),
  'triggers', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY esquema, tabla, nombre) FROM triggers t), '[]'::jsonb),
  'politicas', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename, policyname) FROM pg_policies p WHERE schemaname = 'public'), '[]'::jsonb),
  'permisos_tablas', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY table_name, grantee, privilege_type) FROM information_schema.table_privileges p WHERE table_schema = 'public'), '[]'::jsonb),
  'permisos_columnas', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY table_name, column_name, grantee, privilege_type) FROM information_schema.column_privileges p WHERE table_schema = 'public'), '[]'::jsonb),
  'secuencias', COALESCE((SELECT jsonb_agg(to_jsonb(s) - 'last_value' ORDER BY sequencename) FROM secuencias s), '[]'::jsonb),
  'esquemas', COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY nombre) FROM esquemas e), '[]'::jsonb)
) AS estado;
