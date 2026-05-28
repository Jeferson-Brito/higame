-- ============================================================
-- HIGAME — Migration 005: Fix Purchases RLS
-- ============================================================

-- Permite que o próprio colaborador crie um registro de compra para si mesmo.
CREATE POLICY "employee_insert_own_purchases" ON employee_purchases
  FOR INSERT WITH CHECK (auth.uid() = employee_id);
