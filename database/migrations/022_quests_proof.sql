-- ============================================================
-- HIGAME — Migration 022: Missões com Comprovante (Cursos)
-- ============================================================

-- 1. Adicionar flag na tabela de quests para exigir comprovante
ALTER TABLE quests
ADD COLUMN requires_proof BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Adicionar URL do comprovante e status de validação na relação do funcionário
ALTER TABLE employee_quests
ADD COLUMN proof_url TEXT,
ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'none';
-- validation_status: 'none', 'pending', 'approved', 'rejected'

-- 3. Criar bucket de storage para os comprovantes
-- Executar os comandos abaixo para inserir o bucket, ignorando caso já exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('quest_proofs', 'quest_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de RLS para o bucket quest_proofs
-- (Opcional, pois muitas vezes o storage precisa ser configurado via painel do Supabase, mas tentamos por aqui)
DO $$
BEGIN
  -- Permite que colaboradores façam upload de seus próprios arquivos
  CREATE POLICY "Colaboradores podem subir comprovantes" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'quest_proofs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  -- Permite leitura pública (ou apenas autenticados) dos comprovantes
  CREATE POLICY "Leitura pública de comprovantes" 
  ON storage.objects FOR SELECT 
  TO public 
  USING (bucket_id = 'quest_proofs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Atualizar esquema do PostgREST (Forçar recarregamento de cache)
NOTIFY pgrst, 'reload schema';
