-- Base actual: ajusta solo el bucket productos y su política observada.
-- No elimina archivos ni cambia las fotos existentes.
BEGIN;
-- Configurar tamaño (5 MB) y MIME (JPG/PNG/WebP) desde Storage > productos > configuración.
-- No se modifican registros internos de Storage por SQL.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'productos' AND public) THEN
    RAISE EXCEPTION 'Falta el bucket público productos. Revisar antes de continuar';
  END IF;
END $$;
DROP POLICY IF EXISTS "Admins pueden subir fotos de productos" ON storage.objects;
DROP POLICY IF EXISTS productos_admin_subir ON storage.objects;
DROP POLICY IF EXISTS productos_admin_leer ON storage.objects;
DROP POLICY IF EXISTS productos_admin_eliminar ON storage.objects;
CREATE POLICY productos_admin_subir ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'productos' AND (SELECT private.es_admin()));
CREATE POLICY productos_admin_leer ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'productos' AND (SELECT private.es_admin()));
CREATE POLICY productos_admin_eliminar ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'productos' AND (SELECT private.es_admin()));
COMMIT;
