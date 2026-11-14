-- Definición compartida desde Supabase el 2026-11-14. Archivo de referencia.
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.usuario (
    dni,
    nombre,
    apellido,
    email,
    telefono,
    direccion,
    rol,
    auth_user_id
  )
  values (
    (new.raw_user_meta_data ->> 'dni')::integer,
    new.raw_user_meta_data ->> 'nombre',
    new.raw_user_meta_data ->> 'apellido',
    new.email,
    new.raw_user_meta_data ->> 'telefono',
    new.raw_user_meta_data ->> 'direccion',

    -- Los usuarios registrados desde la web comienzan como clientes.
    'cliente',

    -- Guardamos la relación con la cuenta de Supabase Auth.
    new.id
  );

  return new;
end;
$function$
;
