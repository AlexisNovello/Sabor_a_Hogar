-- Base existente: no cambia pedidos ni estados anteriores.
-- Pendiente de aplicar en Supabase. Solo permite los avances usados por la app.
BEGIN;
CREATE OR REPLACE FUNCTION public.validar_transicion_pedido()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.estado_pedido IS NOT DISTINCT FROM OLD.estado_pedido THEN RETURN NEW; END IF;
  IF (OLD.estado_pedido = 'Pendiente' AND NEW.estado_pedido = 'En preparación')
    OR (OLD.estado_pedido = 'En preparación' AND NEW.estado_pedido = 'Listo') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'La transición del pedido no es válida' USING ERRCODE = '23514';
END;
$$;
REVOKE ALL ON FUNCTION public.validar_transicion_pedido() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS pedido_transicion_valida ON public.pedido;
CREATE TRIGGER pedido_transicion_valida BEFORE UPDATE OF estado_pedido ON public.pedido
FOR EACH ROW EXECUTE FUNCTION public.validar_transicion_pedido();
COMMIT;
