-- ============================================================
-- HIGAME — Migration 003: Motor de Gamificação
-- ============================================================

-- 1. ENUMs de Gamificação
CREATE TYPE rarity_tier AS ENUM ('common', 'rare', 'epic', 'legendary', 'mythic');
CREATE TYPE quest_frequency AS ENUM ('daily', 'weekly', 'season', 'one_shot');
CREATE TYPE item_type AS ENUM ('frame', 'banner', 'title', 'real_reward');

-- 2. Atualizar PROFILES com os novos campos de Gamificação
ALTER TABLE profiles 
ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN last_login TIMESTAMPTZ,
ADD COLUMN coins_balance INTEGER NOT NULL DEFAULT 0,
ADD COLUMN active_title_id UUID,  -- Referência futura
ADD COLUMN active_frame_id UUID,  -- Referência futura
ADD COLUMN active_banner_id UUID; -- Referência futura

-- 3. BADGES (Conquistas e Emblemas)
CREATE TABLE badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT NOT NULL,               -- Emoji, ícone lucide ou URL de imagem
  rarity        rarity_tier NOT NULL DEFAULT 'common',
  xp_reward     INTEGER NOT NULL DEFAULT 0,
  coin_reward   INTEGER NOT NULL DEFAULT 0,
  condition_type TEXT,                       -- "7_days_streak", "first_gold", etc.
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id      UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, badge_id)
);

-- 4. MISSÕES (Quests)
CREATE TABLE quests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  frequency     quest_frequency NOT NULL DEFAULT 'daily',
  xp_reward     INTEGER NOT NULL DEFAULT 0,
  coin_reward   INTEGER NOT NULL DEFAULT 0,
  target_value  INTEGER NOT NULL DEFAULT 1,  -- Quantas vezes precisa fazer algo
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_quests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id      UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  progress      INTEGER NOT NULL DEFAULT 0,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  reset_at      TIMESTAMPTZ,                 -- Quando a missão expira/reseta
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. LOJA DE RECOMPENSAS E CUSTOMIZAÇÃO
CREATE TABLE store_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  type          item_type NOT NULL,
  rarity        rarity_tier NOT NULL DEFAULT 'common',
  price_coins   INTEGER NOT NULL,
  asset_url     TEXT,                        -- Imagem da moldura/banner ou código CSS
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_purchases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  purchased_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionando chaves estrangeiras pendentes em profiles
ALTER TABLE profiles
  ADD CONSTRAINT fk_active_title FOREIGN KEY (active_title_id) REFERENCES store_items(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_active_frame FOREIGN KEY (active_frame_id) REFERENCES store_items(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_active_banner FOREIGN KEY (active_banner_id) REFERENCES store_items(id) ON DELETE SET NULL;

-- 6. ÍNDICES DE PERFORMANCE
CREATE INDEX idx_emp_badges_emp ON employee_badges(employee_id);
CREATE INDEX idx_emp_quests_emp ON employee_quests(employee_id);
CREATE INDEX idx_emp_purchases_emp ON employee_purchases(employee_id);
