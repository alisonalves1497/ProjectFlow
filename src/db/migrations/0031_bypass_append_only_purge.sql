-- Linha do tempo continua append-only pra qualquer código normal — mas a exclusão
-- DEFINITIVA de Obra/Projeto (purgeObra/purgeProjeto) precisa conseguir apagar o histórico
-- junto quando cascateia a partir do documento, senão a trava de append-only impede a
-- exclusão de terminar (mesmo com FK em cascade em todo o resto da cadeia). A função agora
-- só deixa passar quando a própria transação sinalizar isso explicitamente via
-- `SET LOCAL app.bypass_append_only = 'on'` — sem essa flag, continua bloqueando igual antes.
CREATE OR REPLACE FUNCTION reject_mutation() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.bypass_append_only', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'linha_do_tempo é append-only: % não é permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;
