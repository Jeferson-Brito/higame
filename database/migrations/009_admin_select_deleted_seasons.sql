-- ============================================================
-- HIGAME — Migration 009: Correção de Seleção Admin para Temporadas
-- ============================================================

-- Adiciona uma política para que o Administrador consiga selecionar
-- temporadas deletadas, evitando o erro no UPDATE (soft delete).

CREATE POLICY "admin_select_all_seasons" ON seasons
  FOR SELECT USING (is_admin());
