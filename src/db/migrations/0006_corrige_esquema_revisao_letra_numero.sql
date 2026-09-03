-- Custom SQL migration file, put your code below! --

-- Correção de fundação: o esquema kind/ordinal/label (0A/0B/00/AB-00) estava errado,
-- baseado numa suposição incorreta. O processo real é letra+número digitados pelo
-- usuário (A1, A2... A0 quando enviado ao cliente; B1... quando o cliente devolve).

ALTER TABLE "revisoes" DROP CONSTRAINT "revisoes_documento_id_kind_ordinal_unique";

ALTER TABLE "revisoes" DROP COLUMN "label";
ALTER TABLE "revisoes" DROP COLUMN "kind";
ALTER TABLE "revisoes" DROP COLUMN "ordinal";

DROP TYPE "public"."revisao_kind";

ALTER TABLE "revisoes" ADD COLUMN "letra" text;
ALTER TABLE "revisoes" ADD COLUMN "numero" integer;
ALTER TABLE "revisoes" ADD COLUMN "eh_as_built" boolean NOT NULL DEFAULT false;
ALTER TABLE "revisoes" ADD COLUMN "as_built_ordinal" integer;

ALTER TABLE "revisoes" ADD COLUMN "label" text GENERATED ALWAYS AS (
  case when eh_as_built then 'AB-' || lpad(as_built_ordinal::text, 2, '0') else letra || numero::text end
) STORED;

ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_documento_id_letra_numero_unique" UNIQUE ("documento_id","letra","numero");
ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_documento_id_as_built_ordinal_unique" UNIQUE ("documento_id","as_built_ordinal");
ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_letra_numero_xor_as_built" CHECK (
  (eh_as_built = false and letra is not null and numero is not null and as_built_ordinal is null)
  or
  (eh_as_built = true and as_built_ordinal is not null and letra is null and numero is null)
);
