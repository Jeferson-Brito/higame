-- ============================================================
-- HIGAME — Migration 021: Battle Pass Corporativo
-- ============================================================
-- Execute este SQL no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE bp_reward_type AS ENUM ('coins', 'badge', 'store_item', 'custom');

-- ============================================================
-- 2. BATTLE PASS SEASONS
-- ============================================================

CREATE TABLE battle_pass_seasons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  max_level     INTEGER NOT NULL DEFAULT 50,
  xp_per_level  INTEGER NOT NULL DEFAULT 1000,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER bp_seasons_updated_at
  BEFORE UPDATE ON battle_pass_seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_bp_seasons_active ON battle_pass_seasons(is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. BATTLE PASS REWARDS (Trilha de recompensas por nível)
-- ============================================================

CREATE TABLE battle_pass_rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  level         INTEGER NOT NULL CHECK (level >= 1),
  reward_type   bp_reward_type NOT NULL DEFAULT 'coins',
  -- Para coins: { "amount": 100 }
  -- Para badge: { "badge_id": "uuid" }
  -- Para store_item: { "item_id": "uuid" }
  -- Para custom: { "title": "...", "description": "..." }
  reward_value  JSONB NOT NULL DEFAULT '{}',
  rarity        rarity_tier NOT NULL DEFAULT 'common',
  name          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT,                           -- emoji ou chave de asset
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, level)
);

CREATE TRIGGER bp_rewards_updated_at
  BEFORE UPDATE ON battle_pass_rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_bp_rewards_season ON battle_pass_rewards(season_id);
CREATE INDEX idx_bp_rewards_level ON battle_pass_rewards(season_id, level);

-- ============================================================
-- 4. BATTLE PASS PROGRESS (Progresso por colaborador)
-- ============================================================

CREATE TABLE battle_pass_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id     UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 0,      -- nível atual (0 = sem recompensa ainda)
  current_xp    INTEGER NOT NULL DEFAULT 0,      -- XP dentro do nível atual
  total_bp_xp   INTEGER NOT NULL DEFAULT 0,      -- XP total acumulado no passe
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, season_id)
);

CREATE TRIGGER bp_progress_updated_at
  BEFORE UPDATE ON battle_pass_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_bp_progress_employee ON battle_pass_progress(employee_id);
CREATE INDEX idx_bp_progress_season ON battle_pass_progress(season_id);

-- ============================================================
-- 5. BATTLE PASS CLAIMS (Recompensas resgatadas)
-- ============================================================

CREATE TABLE battle_pass_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id     UUID NOT NULL REFERENCES battle_pass_rewards(id) ON DELETE CASCADE,
  claimed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, reward_id)             -- cada recompensa pode ser resgatada 1 vez
);

CREATE INDEX idx_bp_claims_employee ON battle_pass_claims(employee_id);
CREATE INDEX idx_bp_claims_reward ON battle_pass_claims(reward_id);

-- ============================================================
-- 6. ADICIONAR BP XP EM QUESTS
-- ============================================================

ALTER TABLE quests ADD COLUMN bp_xp_reward INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 7. FUNÇÃO: Dar BP XP a um colaborador
-- Pode ser chamada como RPC ou dentro de outras funções
-- ============================================================

CREATE OR REPLACE FUNCTION give_bp_xp(
  p_employee_id UUID,
  p_bp_xp       INTEGER,
  p_reason      TEXT DEFAULT 'Missão concluída'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season       battle_pass_seasons%ROWTYPE;
  v_progress     battle_pass_progress%ROWTYPE;
  v_new_total_xp INTEGER;
  v_new_level    INTEGER;
  v_new_xp       INTEGER;
  v_leveled_up   BOOLEAN := FALSE;
  v_levels_gained INTEGER := 0;
BEGIN
  -- Pega o Battle Pass ativo
  SELECT * INTO v_season 
  FROM battle_pass_seasons 
  WHERE is_active = TRUE AND deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Nenhum Battle Pass ativo');
  END IF;

  -- Pega ou cria o progresso do colaborador
  INSERT INTO battle_pass_progress (employee_id, season_id, current_level, current_xp, total_bp_xp)
  VALUES (p_employee_id, v_season.id, 0, 0, 0)
  ON CONFLICT (employee_id, season_id) DO NOTHING;

  SELECT * INTO v_progress
  FROM battle_pass_progress
  WHERE employee_id = p_employee_id AND season_id = v_season.id;

  -- Calcula o novo total de XP
  v_new_total_xp := v_progress.total_bp_xp + p_bp_xp;

  -- Calcula o novo nível e XP dentro do nível
  v_new_level := LEAST(v_season.max_level, FLOOR(v_new_total_xp::NUMERIC / v_season.xp_per_level)::INTEGER);
  v_new_xp    := v_new_total_xp - (v_new_level * v_season.xp_per_level);

  -- Detecta se subiu de nível
  IF v_new_level > v_progress.current_level THEN
    v_leveled_up   := TRUE;
    v_levels_gained := v_new_level - v_progress.current_level;
  END IF;

  -- Atualiza o progresso
  UPDATE battle_pass_progress
  SET 
    total_bp_xp   = v_new_total_xp,
    current_level = v_new_level,
    current_xp    = CASE WHEN v_new_level >= v_season.max_level THEN v_season.xp_per_level ELSE v_new_xp END
  WHERE employee_id = p_employee_id AND season_id = v_season.id;

  -- Notifica o colaborador se subiu de nível
  IF v_leveled_up THEN
    INSERT INTO notifications (profile_id, title, message, type)
    VALUES (
      p_employee_id,
      '🏆 Nível ' || v_new_level || ' no Battle Pass!',
      'Você avançou para o nível ' || v_new_level || ' no Battle Pass e novas recompensas foram desbloqueadas!',
      'battle_pass_level_up'
    );

    -- Feed social
    INSERT INTO feed_events (profile_id, event_type, event_data)
    VALUES (
      p_employee_id,
      'battle_pass_level_up',
      jsonb_build_object('new_level', v_new_level, 'season_name', v_season.name)
    );
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'leveled_up',     v_leveled_up,
    'levels_gained',  v_levels_gained,
    'new_level',      v_new_level,
    'new_xp',         v_new_xp,
    'total_bp_xp',    v_new_total_xp
  );
END;
$$;

-- ============================================================
-- 8. FUNÇÃO: Resgatar uma recompensa do Battle Pass
-- ============================================================

CREATE OR REPLACE FUNCTION claim_bp_reward(
  p_employee_id UUID,
  p_reward_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward     battle_pass_rewards%ROWTYPE;
  v_progress   battle_pass_progress%ROWTYPE;
  v_season     battle_pass_seasons%ROWTYPE;
  v_badge_id   UUID;
  v_item_id    UUID;
  v_coins      INTEGER;
BEGIN
  -- Busca a recompensa
  SELECT * INTO v_reward FROM battle_pass_rewards WHERE id = p_reward_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Recompensa não encontrada');
  END IF;

  -- Busca a season do passe
  SELECT * INTO v_season FROM battle_pass_seasons WHERE id = v_reward.season_id;

  -- Busca o progresso do colaborador
  SELECT * INTO v_progress 
  FROM battle_pass_progress 
  WHERE employee_id = p_employee_id AND season_id = v_reward.season_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Você não tem progresso neste Battle Pass');
  END IF;

  -- Verifica se o colaborador atingiu o nível necessário
  IF v_progress.current_level < v_reward.level THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Nível insuficiente para resgatar esta recompensa');
  END IF;

  -- Verifica se já resgatou
  IF EXISTS (SELECT 1 FROM battle_pass_claims WHERE employee_id = p_employee_id AND reward_id = p_reward_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Recompensa já resgatada');
  END IF;

  -- Registra o resgate
  INSERT INTO battle_pass_claims (employee_id, reward_id) VALUES (p_employee_id, p_reward_id);

  -- Entrega a recompensa conforme o tipo
  CASE v_reward.reward_type
    WHEN 'coins' THEN
      v_coins := COALESCE((v_reward.reward_value->>'amount')::INTEGER, 0);
      UPDATE profiles SET coins_balance = coins_balance + v_coins WHERE id = p_employee_id;

    WHEN 'badge' THEN
      v_badge_id := (v_reward.reward_value->>'badge_id')::UUID;
      INSERT INTO employee_badges (employee_id, badge_id)
      VALUES (p_employee_id, v_badge_id)
      ON CONFLICT (employee_id, badge_id) DO NOTHING;

    WHEN 'store_item' THEN
      v_item_id := (v_reward.reward_value->>'item_id')::UUID;
      INSERT INTO employee_purchases (employee_id, item_id, status, fulfilled_at)
      VALUES (p_employee_id, v_item_id, 'fulfilled', NOW())
      ON CONFLICT DO NOTHING;

    WHEN 'custom' THEN
      -- Apenas notifica o admin (nenhuma ação automática no DB)
      NULL;
  END CASE;

  -- Notifica o colaborador
  INSERT INTO notifications (profile_id, title, message, type)
  VALUES (
    p_employee_id,
    '🎁 Recompensa resgatada!',
    'Você resgatou "' || v_reward.name || '" do Battle Pass!',
    'battle_pass_claim'
  );

  -- Feed social
  INSERT INTO feed_events (profile_id, event_type, event_data)
  VALUES (
    p_employee_id,
    'battle_pass_reward_claimed',
    jsonb_build_object('reward_name', v_reward.name, 'rarity', v_reward.rarity, 'level', v_reward.level)
  );

  RETURN jsonb_build_object('success', true, 'reward_type', v_reward.reward_type, 'reward_name', v_reward.name);
END;
$$;

-- ============================================================
-- 9. RLS POLICIES
-- ============================================================

ALTER TABLE battle_pass_seasons  ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pass_rewards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pass_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pass_claims   ENABLE ROW LEVEL SECURITY;

-- Seasons: todos podem ver seasons ativas, admin vê tudo
CREATE POLICY "everyone_select_bp_seasons" ON battle_pass_seasons
  FOR SELECT USING (deleted_at IS NULL AND (is_active = TRUE OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )));

CREATE POLICY "admin_all_bp_seasons" ON battle_pass_seasons
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Rewards: todos podem ver rewards de seasons ativas
CREATE POLICY "everyone_select_bp_rewards" ON battle_pass_rewards
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "admin_all_bp_rewards" ON battle_pass_rewards
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Progress: colaborador vê o próprio, admin vê tudo
CREATE POLICY "employee_select_own_bp_progress" ON battle_pass_progress
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "admin_select_all_bp_progress" ON battle_pass_progress
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Claims: colaborador vê os próprios
CREATE POLICY "employee_select_own_bp_claims" ON battle_pass_claims
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "admin_select_all_bp_claims" ON battle_pass_claims
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- FIM DA MIGRATION 021
-- ============================================================
