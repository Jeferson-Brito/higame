-- ============================================================
-- HIGAME — Migration 001: Schema Completo
-- Execute este SQL no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- 1. ENUMs PostgreSQL
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE season_status AS ENUM ('draft', 'active', 'closed');
CREATE TYPE kpi_tier AS ENUM ('gold', 'silver', 'bronze', 'out');
CREATE TYPE kpi_type AS ENUM ('time', 'number', 'percent');

-- ============================================================
-- 2. PROFILES (extensão de auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'employee',
  avatar_url    TEXT,
  position      TEXT,                        -- cargo/função
  team          TEXT,                        -- equipe/setor
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: cria profile ao fazer signup no Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 3. SEASONS (Temporadas)
-- ============================================================

CREATE TABLE seasons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,               -- "Maio 2026"
  month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year          SMALLINT NOT NULL CHECK (year >= 2024),
  status        season_status NOT NULL DEFAULT 'draft',
  description   TEXT,
  started_at    TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(month, year)
);

CREATE TRIGGER seasons_updated_at
  BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. KPI_DEFINITIONS (KPIs dinâmicos por temporada)
-- ============================================================

CREATE TABLE kpi_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,               -- "TME", "NPS", "Absenteísmo"
  slug          TEXT NOT NULL,               -- "tme", "nps", "abs", "qtd"
  type          kpi_type NOT NULL DEFAULT 'number',
  unit          TEXT,                        -- "HH:MM:SS", "pontos", "%", "atend."
  description   TEXT,
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, slug)
);

CREATE TRIGGER kpi_definitions_updated_at
  BEFORE UPDATE ON kpi_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. KPI_RULES (Faixas configuráveis: Ouro, Prata, Bronze, Fora)
-- ============================================================

CREATE TABLE kpi_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id        UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  tier          kpi_tier NOT NULL,
  -- Para tipos numérico/percentual:
  min_value     NUMERIC,
  max_value     NUMERIC,
  -- Para tipo tempo (armazenado em segundos totais):
  min_seconds   INTEGER,
  max_seconds   INTEGER,
  -- XP concedido ao atingir este tier:
  xp_reward     INTEGER NOT NULL DEFAULT 0,
  -- Direção: menor é melhor (TME, ABS) ou maior é melhor (NPS, QTD)?
  lower_is_better BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(kpi_id, tier)
);

CREATE TRIGGER kpi_rules_updated_at
  BEFORE UPDATE ON kpi_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. EMPLOYEE_RESULTS (Resultados mensais por colaborador/KPI)
-- ============================================================

CREATE TABLE employee_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id     UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  kpi_id        UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  -- Valor bruto conforme o tipo do KPI:
  raw_value     TEXT NOT NULL,               -- valor original como inserido
  display_value TEXT NOT NULL,               -- valor formatado para exibição (ex: "00:09:32", "4.8", "1.2%")
  seconds       INTEGER,                     -- preenchido se type = 'time'
  numeric_val   NUMERIC,                     -- preenchido se type = 'number' ou 'percent'
  -- Resultado calculado:
  tier          kpi_tier,
  xp_earned     INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, season_id, kpi_id)
);

CREATE TRIGGER employee_results_updated_at
  BEFORE UPDATE ON employee_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. XP_HISTORY (Histórico de XP por evento)
-- ============================================================

CREATE TABLE xp_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id     UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  xp_delta      INTEGER NOT NULL,            -- XP ganho (positivo) ou perdido (negativo)
  reason        TEXT NOT NULL,               -- "TME Ouro", "Multiplicador todos ouro", etc.
  reference_id  UUID,                        -- ID do resultado ou conquista relacionada
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. RANKINGS (Ranking ativo da temporada)
-- ============================================================

CREATE TABLE rankings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_xp      INTEGER NOT NULL DEFAULT 0,
  total_score   NUMERIC NOT NULL DEFAULT 0,  -- score ponderado (0-100)
  rank_position INTEGER,
  kpi_summary   JSONB,                       -- resumo dos KPIs (tier por KPI)
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, employee_id)
);

-- ============================================================
-- 9. SEASON_SNAPSHOTS (Snapshot imutável ao encerrar temporada)
-- ============================================================

CREATE TABLE season_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Estado final congelado:
  final_xp        INTEGER NOT NULL DEFAULT 0,
  final_level     INTEGER NOT NULL DEFAULT 1,
  final_score     NUMERIC NOT NULL DEFAULT 0,
  final_rank      INTEGER,
  final_tier_summary JSONB,                  -- {tme: 'gold', nps: 'silver', ...}
  xp_breakdown    JSONB,                     -- XP detalhado por KPI + multiplicadores
  snapshot_data   JSONB,                     -- dados completos para consulta futura
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, employee_id)
  -- IMPORTANTE: Sem trigger de updated_at — este registro é IMUTÁVEL
);

-- ============================================================
-- 10. APP_SETTINGS (Configurações globais do sistema)
-- ============================================================

CREATE TABLE app_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL UNIQUE,
  value         JSONB NOT NULL,
  description   TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. Índices para performance
-- ============================================================

CREATE INDEX idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_seasons_status ON seasons(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_definitions_season ON kpi_definitions(season_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_rules_kpi ON kpi_rules(kpi_id);
CREATE INDEX idx_employee_results_employee ON employee_results(employee_id);
CREATE INDEX idx_employee_results_season ON employee_results(season_id);
CREATE INDEX idx_employee_results_composite ON employee_results(employee_id, season_id);
CREATE INDEX idx_xp_history_employee ON xp_history(employee_id);
CREATE INDEX idx_xp_history_season ON xp_history(season_id);
CREATE INDEX idx_rankings_season ON rankings(season_id);
CREATE INDEX idx_rankings_rank ON rankings(season_id, rank_position);
CREATE INDEX idx_snapshots_season ON season_snapshots(season_id);
CREATE INDEX idx_snapshots_employee ON season_snapshots(employee_id);

-- ============================================================
-- Fim da Migration 001
-- ============================================================
