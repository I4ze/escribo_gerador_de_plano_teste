-- 1. Usuários: (opcional, supabase-auth já cria tabela identidades)
-- 2. Tabela principal: lesson_plans
CREATE TABLE public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  titulo text NOT NULL,
  serie_ano text NOT NULL,
  disciplina text NOT NULL,
  tempo_estimado_min integer,
  nivel text,
  objetivos_gerais text,
  recursos jsonb,
  competencias_bncc jsonb,
  metodologia_preferida text,
  avaliacao_desejada text,
  lingua text DEFAULT 'pt-BR',
  input_snapshot jsonb,       -- salva o input original enviado
  plan_json jsonb NOT NULL,   -- plano de aula completo gerado pela IA (JSON)
  rubric_json jsonb,          -- rubrica gerada pela IA (JSON)
  status text DEFAULT 'generated', -- generated | failed | pending
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lesson_plans_timestamp
BEFORE UPDATE ON public.lesson_plans
FOR EACH ROW EXECUTE PROCEDURE set_timestamp();
