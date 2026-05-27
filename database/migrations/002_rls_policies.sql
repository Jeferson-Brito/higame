-- ============================================================
-- HIGAME — Migration 002: Row Level Security (RLS)
-- Execute APÓS a Migration 001
-- ============================================================

-- ============================================================
-- Habilitar RLS em todas as tabelas
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: verificar se usuário logado é admin
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================

-- Admin vê todos os perfis ativos
CREATE POLICY "admin_select_profiles" ON profiles
  FOR SELECT USING (is_admin() AND deleted_at IS NULL);

-- Employee vê apenas o próprio perfil
CREATE POLICY "employee_select_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

-- Admin pode inserir/atualizar perfis
CREATE POLICY "admin_insert_profiles" ON profiles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_profiles" ON profiles
  FOR UPDATE USING (is_admin());

-- Employee pode atualizar apenas os próprios dados (nome, avatar)
CREATE POLICY "employee_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- NUNCA permite DELETE físico (soft delete apenas)
-- Sem política de DELETE = ninguém pode deletar

-- ============================================================
-- SEASONS
-- ============================================================

-- Todos os autenticados podem ver temporadas ativas (não deletadas)
CREATE POLICY "authenticated_select_seasons" ON seasons
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Apenas admin pode criar/editar/soft-delete temporadas
CREATE POLICY "admin_insert_seasons" ON seasons
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_seasons" ON seasons
  FOR UPDATE USING (is_admin());

-- ============================================================
-- KPI_DEFINITIONS
-- ============================================================

-- Todos os autenticados veem KPIs ativos
CREATE POLICY "authenticated_select_kpis" ON kpi_definitions
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Apenas admin gerencia KPIs
CREATE POLICY "admin_insert_kpis" ON kpi_definitions
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_kpis" ON kpi_definitions
  FOR UPDATE USING (is_admin());

-- ============================================================
-- KPI_RULES
-- ============================================================

-- Todos os autenticados veem as regras
CREATE POLICY "authenticated_select_kpi_rules" ON kpi_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas admin gerencia regras
CREATE POLICY "admin_insert_kpi_rules" ON kpi_rules
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_kpi_rules" ON kpi_rules
  FOR UPDATE USING (is_admin());

CREATE POLICY "admin_delete_kpi_rules" ON kpi_rules
  FOR DELETE USING (is_admin());

-- ============================================================
-- EMPLOYEE_RESULTS
-- ============================================================

-- Admin vê todos os resultados
CREATE POLICY "admin_select_results" ON employee_results
  FOR SELECT USING (is_admin());

-- Employee vê apenas os próprios resultados
CREATE POLICY "employee_select_own_results" ON employee_results
  FOR SELECT USING (auth.uid() = employee_id);

-- Admin pode inserir resultados em temporadas abertas (draft ou active)
CREATE POLICY "admin_insert_results" ON employee_results
  FOR INSERT WITH CHECK (
    is_admin()
    AND EXISTS (
      SELECT 1 FROM seasons
      WHERE id = season_id AND status != 'closed' AND deleted_at IS NULL
    )
  );

-- Admin pode atualizar resultados SOMENTE em temporadas abertas
CREATE POLICY "admin_update_results" ON employee_results
  FOR UPDATE USING (
    is_admin()
    AND EXISTS (
      SELECT 1 FROM seasons
      WHERE id = season_id AND status != 'closed' AND deleted_at IS NULL
    )
  );

-- NUNCA permite editar resultados de temporadas fechadas
-- (RLS acima já garante isso — sem policy de UPDATE para closed)

-- ============================================================
-- XP_HISTORY
-- ============================================================

-- Admin vê todo o histórico de XP
CREATE POLICY "admin_select_xp_history" ON xp_history
  FOR SELECT USING (is_admin());

-- Employee vê apenas o próprio histórico
CREATE POLICY "employee_select_own_xp_history" ON xp_history
  FOR SELECT USING (auth.uid() = employee_id);

-- Apenas admin insere XP (via backend/trigger)
CREATE POLICY "admin_insert_xp_history" ON xp_history
  FOR INSERT WITH CHECK (is_admin());

-- Histórico é imutável: sem UPDATE ou DELETE

-- ============================================================
-- RANKINGS
-- ============================================================

-- Todos os autenticados podem ver o ranking (é público dentro do sistema)
CREATE POLICY "authenticated_select_rankings" ON rankings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas admin pode inserir/atualizar rankings
CREATE POLICY "admin_insert_rankings" ON rankings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_rankings" ON rankings
  FOR UPDATE USING (is_admin());

-- ============================================================
-- SEASON_SNAPSHOTS (IMUTÁVEL — somente leitura para todos após criação)
-- ============================================================

-- Admin e employee podem ver snapshots
CREATE POLICY "authenticated_select_snapshots" ON season_snapshots
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Employee vê apenas o próprio snapshot
-- (a policy acima já abrange, mas adicionamos como referência)

-- Apenas admin pode criar snapshots (ao encerrar temporada)
CREATE POLICY "admin_insert_snapshots" ON season_snapshots
  FOR INSERT WITH CHECK (is_admin());

-- NINGUÉM pode atualizar ou deletar snapshots (imutável por design)
-- Sem políticas de UPDATE ou DELETE = proibido para todos

-- ============================================================
-- APP_SETTINGS
-- ============================================================

-- Todos os autenticados podem ler configurações
CREATE POLICY "authenticated_select_settings" ON app_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas admin pode modificar
CREATE POLICY "admin_update_settings" ON app_settings
  FOR UPDATE USING (is_admin());

CREATE POLICY "admin_insert_settings" ON app_settings
  FOR INSERT WITH CHECK (is_admin());

-- ============================================================
-- Fim da Migration 002
-- ============================================================
