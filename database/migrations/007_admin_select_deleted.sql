-- ============================================================
-- HIGAME — Migration 007: Correção de Seleção Admin
-- ============================================================

-- Permite que o administrador selecione inclusive usuários deletados (soft delete),
-- para evitar erros do PostgREST ao atualizar a coluna deleted_at.

DROP POLICY IF EXISTS "admin_select_profiles" ON profiles;

CREATE POLICY "admin_select_profiles" ON profiles
  FOR SELECT USING (is_admin());
