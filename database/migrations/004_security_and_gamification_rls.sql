-- ============================================================
-- HIGAME — Migration 004: Segurança e RLS da Gamificação
-- Execute APÓS as migrations 001, 002 e 003
-- ============================================================

-- ============================================================
-- 1. Profiles: leitura pública interna e proteção de update próprio
-- ============================================================

-- O ranking precisa exibir nome/cargo/time/avatar dos colaboradores.
-- A tabela profiles não armazena email, então esses dados são públicos
-- apenas para usuários autenticados da plataforma.
CREATE POLICY "authenticated_select_active_profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE AND deleted_at IS NULL);

DROP POLICY IF EXISTS "employee_update_own_profile" ON profiles;

CREATE POLICY "employee_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id AND role = 'employee' AND deleted_at IS NULL);

CREATE OR REPLACE FUNCTION enforce_employee_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role
      OR NEW.position IS DISTINCT FROM OLD.position
      OR NEW.team IS DISTINCT FROM OLD.team
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
      OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
      OR NEW.longest_streak IS DISTINCT FROM OLD.longest_streak
      OR NEW.last_login IS DISTINCT FROM OLD.last_login
      OR NEW.coins_balance IS DISTINCT FROM OLD.coins_balance
      OR NEW.active_title_id IS DISTINCT FROM OLD.active_title_id
      OR NEW.active_frame_id IS DISTINCT FROM OLD.active_frame_id
      OR NEW.active_banner_id IS DISTINCT FROM OLD.active_banner_id
    THEN
      RAISE EXCEPTION 'Colaboradores só podem alterar nome e avatar do próprio perfil.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_employee_profile_update ON profiles;

CREATE TRIGGER protect_employee_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_employee_profile_update();

-- ============================================================
-- 2. Snapshots: admin vê todos, colaborador vê apenas o próprio
-- ============================================================

DROP POLICY IF EXISTS "authenticated_select_snapshots" ON season_snapshots;

CREATE POLICY "admin_select_snapshots" ON season_snapshots
  FOR SELECT USING (is_admin());

CREATE POLICY "employee_select_own_snapshots" ON season_snapshots
  FOR SELECT USING (auth.uid() = employee_id);

-- ============================================================
-- 3. RLS para as novas tabelas da gamificação
-- ============================================================

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_purchases ENABLE ROW LEVEL SECURITY;

-- BADGES
CREATE POLICY "authenticated_select_active_badges" ON badges
  FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active = TRUE OR is_admin()));

CREATE POLICY "admin_insert_badges" ON badges
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_badges" ON badges
  FOR UPDATE USING (is_admin());

CREATE POLICY "admin_delete_badges" ON badges
  FOR DELETE USING (is_admin());

-- EMPLOYEE_BADGES
CREATE POLICY "admin_select_employee_badges" ON employee_badges
  FOR SELECT USING (is_admin());

CREATE POLICY "employee_select_own_badges" ON employee_badges
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "admin_insert_employee_badges" ON employee_badges
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_delete_employee_badges" ON employee_badges
  FOR DELETE USING (is_admin());

-- QUESTS
CREATE POLICY "authenticated_select_active_quests" ON quests
  FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active = TRUE OR is_admin()));

CREATE POLICY "admin_insert_quests" ON quests
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_quests" ON quests
  FOR UPDATE USING (is_admin());

CREATE POLICY "admin_delete_quests" ON quests
  FOR DELETE USING (is_admin());

-- EMPLOYEE_QUESTS
CREATE POLICY "admin_select_employee_quests" ON employee_quests
  FOR SELECT USING (is_admin());

CREATE POLICY "employee_select_own_quests" ON employee_quests
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "admin_insert_employee_quests" ON employee_quests
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_employee_quests" ON employee_quests
  FOR UPDATE USING (is_admin());

CREATE POLICY "admin_delete_employee_quests" ON employee_quests
  FOR DELETE USING (is_admin());

-- STORE_ITEMS
CREATE POLICY "authenticated_select_active_store_items" ON store_items
  FOR SELECT USING (auth.uid() IS NOT NULL AND (is_active = TRUE OR is_admin()));

CREATE POLICY "admin_insert_store_items" ON store_items
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_store_items" ON store_items
  FOR UPDATE USING (is_admin());

CREATE POLICY "admin_delete_store_items" ON store_items
  FOR DELETE USING (is_admin());

-- EMPLOYEE_PURCHASES
CREATE POLICY "admin_select_employee_purchases" ON employee_purchases
  FOR SELECT USING (is_admin());

CREATE POLICY "employee_select_own_purchases" ON employee_purchases
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "admin_insert_employee_purchases" ON employee_purchases
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_delete_employee_purchases" ON employee_purchases
  FOR DELETE USING (is_admin());

-- ============================================================
-- Fim da Migration 004
-- ============================================================
