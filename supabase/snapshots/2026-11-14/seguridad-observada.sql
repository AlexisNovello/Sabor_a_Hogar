-- Configuración OBSERVADA en los resultados compartidos el 2026-11-14.
-- No es una migración. No ejecutar: conserva el estado previo al endurecimiento.
-- El estado remoto posterior a las migraciones no fue exportado.

CREATE OR REPLACE FUNCTION private.es_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario
    WHERE auth_user_id = (SELECT auth.uid()) AND rol = 'admin'
  );
$function$;

CREATE TRIGGER al_crear_usuario_auth AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();

ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_pedido DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock DISABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_admin_actualiza_cliente ON public.usuario
AS PERMISSIVE FOR UPDATE TO authenticated
USING ((SELECT private.es_admin()) AND rol::text = 'cliente'::text)
WITH CHECK ((SELECT private.es_admin()) AND rol::text = 'cliente'::text);

CREATE POLICY usuario_lectura_propia_o_admin ON public.usuario
AS PERMISSIVE FOR SELECT TO authenticated
USING (auth_user_id = (SELECT auth.uid()) OR (SELECT private.es_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON public.detalle_pedido, public.pedido, public.producto, public.receta, public.stock
TO anon, authenticated;
GRANT SELECT, INSERT, DELETE, REFERENCES ON public.usuario TO anon, authenticated;
GRANT UPDATE (bloqueado) ON public.usuario TO authenticated;
-- No se compartieron propietarios, permisos de funciones/esquemas/secuencias,
-- ni permisos para roles distintos de anon, authenticated y PUBLIC.
