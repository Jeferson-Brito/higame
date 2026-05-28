-- ============================================================
-- HIGAME — Migration 010: Correção RLS Loja (Admin)
-- ============================================================

-- Permite que o administrador (is_admin) consiga ver e atualizar os 
-- pedidos de compra dos colaboradores (employee_purchases).

-- Garante que o Admin possa selecionar as compras (caso falte):
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employee_purchases' AND policyname = 'admin_select_purchases'
  ) THEN
    CREATE POLICY "admin_select_purchases" ON employee_purchases
      FOR SELECT USING (is_admin());
  END IF;
END $$;

-- Permite que o Admin possa atualizar as compras (aprovar/recusar):
DROP POLICY IF EXISTS "admin_update_purchases" ON employee_purchases;
CREATE POLICY "admin_update_purchases" ON employee_purchases
  FOR UPDATE USING (is_admin());
