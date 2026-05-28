-- ============================================================
-- HIGAME — Migration 008: Storage para Avatares
-- ============================================================

-- 1. Cria o bucket de avatares (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de segurança (RLS) para o Storage

-- Permite que qualquer um (mesmo não logado, já que é public) possa ver as fotos
CREATE POLICY "Avatares são públicos para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Permite que o Admin faça upload de fotos
CREATE POLICY "Admin pode enviar fotos de avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- Permite que o Admin atualize/delete fotos existentes
CREATE POLICY "Admin pode atualizar fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

CREATE POLICY "Admin pode deletar fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);
