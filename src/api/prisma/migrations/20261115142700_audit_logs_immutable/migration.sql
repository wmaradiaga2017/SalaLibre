-- Inmutabilidad de audit_logs (D-05). Migración SQL propia: nunca se elimina, regenera ni reemplaza por código.
-- audit_logs solo recibe filas nuevas: cualquier UPDATE, DELETE o TRUNCATE lanza una excepción.
-- El trigger es por sentencia para que falle aunque la sentencia no afecte filas.
CREATE OR REPLACE FUNCTION audit_logs_block_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs es inmutable: % no está permitido', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_block_changes();
