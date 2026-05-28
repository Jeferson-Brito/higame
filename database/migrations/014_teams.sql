-- ============================================================
-- HIGAME — Migration 014: Sistema de Equipes Oficial
-- ============================================================

-- 1. Criar tabela de equipes
CREATE TABLE teams (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL UNIQUE,
  description TEXT,
  color       TEXT    NOT NULL DEFAULT '#7C3AED',
  icon        TEXT    NOT NULL DEFAULT '🏆',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "everyone_reads_teams" ON teams
  FOR SELECT USING (true);

CREATE POLICY "admins_manage_teams" ON teams
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Adicionar coluna team_id em profiles
ALTER TABLE profiles ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 4. Mapeamento automático: criar equipes a partir dos valores únicos do campo team
--    e associar profiles ao team_id correspondente
DO $$
DECLARE
  t TEXT;
  new_team_id UUID;
BEGIN
  FOR t IN
    SELECT DISTINCT team FROM profiles WHERE team IS NOT NULL AND TRIM(team) != ''
  LOOP
    -- Insere a equipe (se já não existir pelo nome)
    INSERT INTO teams (name, icon, color)
    VALUES (t, '🏆', '#7C3AED')
    ON CONFLICT (name) DO NOTHING;

    -- Busca o ID da equipe recém criada (ou existente)
    SELECT id INTO new_team_id FROM teams WHERE name = t;

    -- Associa todos os profiles que tinham esse valor de texto
    UPDATE profiles SET team_id = new_team_id WHERE team = t;
  END LOOP;
END $$;

-- 5. Índice para queries de ranking por equipe
CREATE INDEX idx_profiles_team_id ON profiles(team_id);

-- ============================================================
-- VIEW: ranking_por_equipe
-- Soma o XP total da temporada ativa por equipe
-- ============================================================

CREATE OR REPLACE VIEW team_rankings AS
SELECT
  t.id          AS team_id,
  t.name        AS team_name,
  t.color       AS team_color,
  t.icon        AS team_icon,
  COUNT(p.id)   AS member_count,
  COALESCE(SUM(r.total_xp), 0) AS total_xp,
  COALESCE(SUM(r.total_score), 0) AS total_score,
  RANK() OVER (ORDER BY COALESCE(SUM(r.total_xp), 0) DESC) AS rank_position,
  s.id          AS season_id,
  s.name        AS season_name
FROM teams t
LEFT JOIN profiles p ON p.team_id = t.id AND p.is_active = true AND p.role = 'employee'
LEFT JOIN seasons s ON s.status = 'active'
LEFT JOIN rankings r ON r.employee_id = p.id AND r.season_id = s.id
WHERE t.is_active = true
GROUP BY t.id, t.name, t.color, t.icon, s.id, s.name;

-- Permissão para a view
GRANT SELECT ON team_rankings TO authenticated;
