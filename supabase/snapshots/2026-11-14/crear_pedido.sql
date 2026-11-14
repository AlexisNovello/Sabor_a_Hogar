-- Definición compartida desde Supabase el 2026-11-14. Archivo de referencia.
CREATE OR REPLACE FUNCTION public.crear_pedido(productos jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  nuevo_id_pedido INT;
  dni_cliente public.usuario.dni%TYPE;
  cliente_bloqueado boolean;
  id_cuenta uuid;
  item JSONB;
  producto_pedido RECORD;
  ingrediente_pedido RECORD;
  stock_actual NUMERIC;
  platos_afectados TEXT;
  precio_actual NUMERIC(12,2);
  estado_producto TEXT;
  nombre_producto TEXT;
  carrito JSONB;
BEGIN
  id_cuenta := auth.uid();

  IF id_cuenta IS NULL THEN
    RAISE EXCEPTION 'Iniciá sesión para confirmar tu pedido';
  END IF;

  -- obtiene el cliente desde la cuenta autenticada
  BEGIN
    SELECT u.dni, u.bloqueado
    INTO STRICT dni_cliente, cliente_bloqueado
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

  IF cliente_bloqueado THEN
    RAISE EXCEPTION 'Tu cuenta está bloqueada para realizar pedidos';
  END IF;

  -- comprueba la estructura del carrito
  IF productos IS NULL OR jsonb_typeof(productos) <> 'array' THEN
    RAISE EXCEPTION 'El carrito debe ser una lista';
  END IF;

  IF jsonb_array_length(productos) = 0 THEN
    RAISE EXCEPTION 'El carrito está vacío';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(productos)
  LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      RAISE EXCEPTION 'El carrito contiene un producto inválido';
    END IF;

    IF COALESCE(item ->> 'id_producto', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'El identificador del producto no es válido';
    END IF;

    IF COALESCE(item ->> 'cantidad', '') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'La cantidad debe ser un entero positivo';
    END IF;

    IF (item ->> 'id_producto')::NUMERIC > 2147483647
      OR (item ->> 'cantidad')::NUMERIC > 2147483647 THEN
      RAISE EXCEPTION 'El producto o la cantidad exceden el límite permitido';
    END IF;
  END LOOP;

  -- agrupa productos repetidos dentro del carrito
  SELECT jsonb_agg(
    jsonb_build_object(
      'id_producto', agrupado.id_producto,
      'cantidad', agrupado.cantidad
    )
    ORDER BY agrupado.id_producto
  )
  INTO carrito
  FROM (
    SELECT
      (value ->> 'id_producto')::INT AS id_producto,
      SUM((value ->> 'cantidad')::NUMERIC) AS cantidad
    FROM jsonb_array_elements(productos)
    GROUP BY (value ->> 'id_producto')::INT
  ) AS agrupado;

  -- mantiene las recetas sin modificaciones durante este pedido
  LOCK TABLE public.receta IN SHARE MODE;

  -- comprueba los productos, su publicación y sus recetas
  FOR producto_pedido IN
    SELECT *
    FROM jsonb_to_recordset(carrito)
      AS x(id_producto INT, cantidad NUMERIC)
    ORDER BY id_producto
  LOOP
    IF producto_pedido.cantidad > 2147483647 THEN
      RAISE EXCEPTION 'La cantidad total de un producto es demasiado grande';
    END IF;

    -- conserva la publicación y el precio hasta finalizar el pedido
    SELECT p.precio, p.estado, p.nombre
    INTO precio_actual, estado_producto, nombre_producto
    FROM public.producto AS p
    WHERE p.id_producto = producto_pedido.id_producto
    FOR SHARE;

    IF NOT FOUND OR precio_actual IS NULL THEN
      RAISE EXCEPTION 'Producto inexistente o sin precio';
    END IF;

    -- rechaza también los platos guardados en carritos anteriores
    IF estado_producto = 'oculto' THEN
      RAISE EXCEPTION 'Plato retirado de la carta: %', nombre_producto;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.receta AS r
      WHERE r.id_producto = producto_pedido.id_producto
    ) THEN
      RAISE EXCEPTION
        'El producto % todavía no tiene receta cargada',
        producto_pedido.id_producto;
    END IF;
  END LOOP;

  -- calcula el consumo total por ingrediente de todo el pedido
  FOR ingrediente_pedido IN
    SELECT
      r.id_ingrediente,
      SUM(r.cantidad_necesaria * x.cantidad) AS cantidad_total
    FROM jsonb_to_recordset(carrito)
      AS x(id_producto INT, cantidad NUMERIC)
    JOIN public.receta AS r
      ON r.id_producto = x.id_producto
    GROUP BY r.id_ingrediente
    ORDER BY r.id_ingrediente
  LOOP
    -- bloquea el ingrediente hasta finalizar la operación
    SELECT s.cantidad_stock
    INTO stock_actual
    FROM public.stock AS s
    WHERE s.id_ingrediente = ingrediente_pedido.id_ingrediente
    FOR UPDATE;

    IF NOT FOUND OR stock_actual IS NULL THEN
      RAISE EXCEPTION 'No se encontró el stock de un ingrediente';
    END IF;

    IF stock_actual < ingrediente_pedido.cantidad_total THEN
      -- busca los platos del carrito que utilizan el ingrediente faltante
      SELECT string_agg(DISTINCT p.nombre, ', ' ORDER BY p.nombre)
      INTO platos_afectados
      FROM jsonb_to_recordset(carrito)
        AS x(id_producto INT, cantidad NUMERIC)
      JOIN public.producto AS p
        ON p.id_producto = x.id_producto
      JOIN public.receta AS r
        ON r.id_producto = p.id_producto
      WHERE r.id_ingrediente = ingrediente_pedido.id_ingrediente;

      RAISE EXCEPTION
        'Disponibilidad insuficiente para la cantidad solicitada: %',
        platos_afectados;
    END IF;

    -- descuenta solamente lo necesario para este pedido
    UPDATE public.stock
    SET cantidad_stock =
      cantidad_stock - ingrediente_pedido.cantidad_total
    WHERE id_ingrediente = ingrediente_pedido.id_ingrediente;
  END LOOP;

  -- guarda el pedido asociado al cliente
  INSERT INTO public.pedido (tipo_entrega, dni)
  VALUES ('retiro', dni_cliente)
  RETURNING id_pedido INTO nuevo_id_pedido;

  -- guarda los productos con el precio actual de la base
  FOR producto_pedido IN
    SELECT *
    FROM jsonb_to_recordset(carrito)
      AS x(id_producto INT, cantidad NUMERIC)
    ORDER BY id_producto
  LOOP
    SELECT p.precio
    INTO precio_actual
    FROM public.producto AS p
    WHERE p.id_producto = producto_pedido.id_producto;

    IF NOT FOUND OR precio_actual IS NULL THEN
      RAISE EXCEPTION 'Producto inexistente o sin precio';
    END IF;

    INSERT INTO public.detalle_pedido (
      id_pedido,
      id_producto,
      cantidad,
      precio_unitario
    ) VALUES (
      nuevo_id_pedido,
      producto_pedido.id_producto,
      producto_pedido.cantidad::INT,
      precio_actual
    );
  END LOOP;

  RETURN nuevo_id_pedido;
END;
$function$
;
