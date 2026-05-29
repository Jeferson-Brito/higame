-- ============================================================
-- HIGAME — Migration 023: Permissão para colaborador atualizar quests (anexar comprovante)
-- ============================================================

CREATE POLICY "employee_update_own_quests" ON employee_quests
  FOR UPDATE USING (auth.uid() = employee_id);
