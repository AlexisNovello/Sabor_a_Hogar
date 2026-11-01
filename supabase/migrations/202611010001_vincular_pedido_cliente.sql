-- Ejecutar en SQL Editor de Supabase. No modifica pedidos anteriores.
BEGIN;

CREATE OR REPLACE FUNCTION public.crear_pedido(productos jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  nuevo_id_pedido INT;
  dni_cliente public.usuario.dni%TYPE;
  id_cuenta uuid;
  item JSONB;
  cantidad_item INT;
  precio_actual NUMERIC(12,2);
BEGIN
  id_cuenta := auth.uid();
  IF id_cuenta IS NULL THEN
    RAISE EXCEPTION 'Iniciá sesión para confirmar tu pedido';
  END IF;

  -- La identidad proviene de Auth, nunca del carrito enviado por el cliente.
  BEGIN
    SELECT u.dni INTO STRICT dni_cliente
    FROM public.usuario AS u
    WHERE u.auth_user_id = id_cuenta;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'No se encontró el perfil de tu cuenta';
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Tu cuenta tiene más de un perfil vinculado';
  END;

  IF dni_cliente IS NULL THEN
    RAISE EXCEPTION 'Tu perfil no tiene un DNI registrado';
  END IF;

  IF productos IS NULL OR jsonb_typeof(productos) <> 'array' THEN
    RAISE EXCEPTION 'El carrito debe ser una lista';
  END IF;
  IF jsonb_array_length(productos) = 0 THEN
    RAISE EXCEPTION 'El carrito está vacío';
  END IF;

  INSERT INTO public.pedido (tipo_entrega, dni)
  VALUES ('retiro', dni_cliente)
  RETURNING id_pedido INTO nuevo_id_pedido;

  FOR item IN SELECT value FROM jsonb_array_elements(productos)
  LOOP
    IF COALESCE(item ->> 'cantidad', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'La cantidad debe ser un entero positivo';
    END IF;
    cantidad_item := (item ->> 'cantidad')::INT;

    SELECT p.precio INTO precio_actual
    FROM public.producto AS p
    WHERE p.id_producto = (item ->> 'id_producto')::INT;
    IF NOT FOUND OR precio_actual IS NULL THEN
      RAISE EXCEPTION 'Producto inexistente o sin precio';
    END IF;

    INSERT INTO public.detalle_pedido (
      id_pedido, id_producto, cantidad, precio_unitario
    ) VALUES (
      nuevo_id_pedido, (item ->> 'id_producto')::INT,
      cantidad_item, precio_actual
    );
  END LOOP;

  RETURN nuevo_id_pedido;
END;
$function$;

COMMIT;
