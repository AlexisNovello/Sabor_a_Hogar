-- Ejecutar DESPUÉS de 202611140001 en SQL Editor como postgres.
-- Una sola transacción: cualquier error revierte todos los cambios.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE CREATE ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuario
    WHERE auth_user_id = (SELECT auth.uid()) AND rol = 'admin' AND NOT bloqueado);
$$;

CREATE OR REPLACE FUNCTION private.cuenta_activa()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuario
    WHERE auth_user_id = (SELECT auth.uid()) AND NOT bloqueado);
$$;

CREATE OR REPLACE FUNCTION private.es_cocina()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuario
    WHERE auth_user_id = (SELECT auth.uid()) AND rol = 'cocina' AND NOT bloqueado);
$$;

CREATE OR REPLACE FUNCTION private.dni_actual()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT dni FROM public.usuario
    WHERE auth_user_id = (SELECT auth.uid()) AND NOT bloqueado;
$$;

ALTER FUNCTION private.es_admin() OWNER TO postgres;
ALTER FUNCTION private.cuenta_activa() OWNER TO postgres;
ALTER FUNCTION private.es_cocina() OWNER TO postgres;
ALTER FUNCTION private.dni_actual() OWNER TO postgres;
REVOKE ALL ON FUNCTION private.es_admin(), private.cuenta_activa(), private.es_cocina(), private.dni_actual() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.es_admin(), private.cuenta_activa(), private.es_cocina(), private.dni_actual() TO authenticated;

-- Reemplaza las políticas de estas seis tablas; no modifica sus datos.
DO $$
DECLARE p record; t text; columnas text;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN
      ('usuario', 'producto', 'receta', 'stock', 'pedido', 'detalle_pedido')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['usuario','producto','receta','stock','pedido','detalle_pedido']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    -- Los permisos de columna son independientes de los permisos de tabla.
    SELECT string_agg(quote_ident(attname), ', ') INTO columnas
      FROM pg_attribute WHERE attrelid = format('public.%I', t)::regclass
      AND attnum > 0 AND NOT attisdropped;
    EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.%I FROM PUBLIC, anon, authenticated', columnas, t);
  END LOOP;
END $$;

-- El usuario puede consultar su perfil aun bloqueado para mostrar el aviso.
GRANT SELECT ON public.usuario TO authenticated;
GRANT UPDATE (bloqueado) ON public.usuario TO authenticated;
CREATE POLICY usuario_lectura_propia_o_admin ON public.usuario
FOR SELECT TO authenticated
USING (auth_user_id = (SELECT auth.uid()) OR (SELECT private.es_admin()));
CREATE POLICY usuario_admin_actualiza_cliente ON public.usuario
FOR UPDATE TO authenticated
USING ((SELECT private.es_admin()) AND rol = 'cliente')
WITH CHECK ((SELECT private.es_admin()) AND rol = 'cliente');

-- La carta actual calcula disponibilidad leyendo recetas y cantidades de stock.
-- Por compatibilidad esos datos siguen siendo legibles para visitantes.
GRANT SELECT ON public.producto, public.receta, public.stock TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.producto, public.receta, public.stock TO authenticated;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['producto','receta','stock'] LOOP
    EXECUTE format('CREATE POLICY catalogo_visitantes ON public.%I FOR SELECT TO anon USING (true)', t);
    EXECUTE format('CREATE POLICY catalogo_cuentas_activas ON public.%I FOR SELECT TO authenticated USING ((SELECT private.cuenta_activa()))', t);
    EXECUTE format('CREATE POLICY administracion_insertar ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT private.es_admin()))', t);
    EXECUTE format('CREATE POLICY administracion_actualizar ON public.%I FOR UPDATE TO authenticated USING ((SELECT private.es_admin())) WITH CHECK ((SELECT private.es_admin()))', t);
    EXECUTE format('CREATE POLICY administracion_eliminar ON public.%I FOR DELETE TO authenticated USING ((SELECT private.es_admin()))', t);
  END LOOP;
END $$;

-- No hay INSERT/DELETE directo de pedidos desde el navegador.
-- crear_pedido controla identidad, cantidades, precios y stock en transacción.
GRANT SELECT ON public.pedido, public.detalle_pedido TO authenticated;
GRANT UPDATE (estado_pedido) ON public.pedido TO authenticated;
CREATE POLICY pedido_lectura ON public.pedido FOR SELECT TO authenticated
USING (dni = (SELECT private.dni_actual()) OR (SELECT private.es_cocina()) OR (SELECT private.es_admin()));
CREATE POLICY detalle_lectura ON public.detalle_pedido FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.pedido p WHERE p.id_pedido = detalle_pedido.id_pedido));
CREATE POLICY pedido_cocina_actualiza ON public.pedido FOR UPDATE TO authenticated
USING ((SELECT private.es_cocina())) WITH CHECK ((SELECT private.es_cocina()));

-- Eleva únicamente esta función revisada, conservando las validaciones internas.
ALTER FUNCTION public.crear_pedido(jsonb) SECURITY DEFINER;
ALTER FUNCTION public.crear_pedido(jsonb) OWNER TO postgres;
ALTER FUNCTION public.crear_pedido(jsonb) SET search_path = '';
REVOKE ALL ON FUNCTION public.crear_pedido(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crear_pedido(jsonb) TO authenticated;

-- Las altas administrativas necesitan las secuencias de sus identificadores.
-- Revoca acceso del navegador al resto de secuencias vinculadas a estas tablas.
DO $$
DECLARE s record;
BEGIN
  FOR s IN
    SELECT DISTINCT ns.nspname, seq.relname, tab.relname AS tabla
    FROM pg_class seq
    JOIN pg_namespace ns ON ns.oid = seq.relnamespace
    JOIN pg_depend d ON d.objid = seq.oid AND d.classid = 'pg_class'::regclass
      AND d.refclassid = 'pg_class'::regclass AND d.deptype IN ('a', 'i')
    JOIN pg_class tab ON tab.oid = d.refobjid
    JOIN pg_namespace nt ON nt.oid = tab.relnamespace
    WHERE seq.relkind = 'S' AND nt.nspname = 'public'
      AND tab.relname IN ('usuario','producto','receta','stock','pedido','detalle_pedido')
  LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE %I.%I FROM PUBLIC, anon, authenticated', s.nspname, s.relname);
    IF s.tabla IN ('producto','receta','stock') THEN
      EXECUTE format('GRANT USAGE ON SEQUENCE %I.%I TO authenticated', s.nspname, s.relname);
    END IF;
  END LOOP;
END $$;

COMMIT;
