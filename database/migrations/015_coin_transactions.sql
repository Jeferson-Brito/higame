-- ============================================================
-- HIGAME — Migration 015: Histórico de HC (Coin Transactions)
-- ============================================================

CREATE TABLE coin_transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  amount      INTEGER     NOT NULL,  -- positivo = crédito, negativo = débito
  reason      TEXT        NOT NULL,
  reference_type TEXT,               -- 'manual', 'quest', 'purchase', 'badge'
  reference_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_coin_tx_profile ON coin_transactions(profile_id);
CREATE INDEX idx_coin_tx_created ON coin_transactions(created_at DESC);

-- RLS
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Colaborador vê apenas as próprias transações
CREATE POLICY "employee_reads_own_transactions" ON coin_transactions
  FOR SELECT USING (profile_id = auth.uid());

-- Admin vê todas
CREATE POLICY "admin_reads_all_transactions" ON coin_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Apenas admins inserem
CREATE POLICY "admin_inserts_transactions" ON coin_transactions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Seed: Molduras e Banners visuais reais na loja
-- ============================================================

INSERT INTO store_items (name, description, type, rarity, price_coins, asset_url, is_active) VALUES

-- === MOLDURAS ===
('Moldura Neon', 'Borda pulsante em verde neon. Para quem brilha no trabalho.', 'frame', 'rare', 500, 'frame:neon', true),
('Moldura Dourada', 'Borda dourada com brilho premium para os líderes da empresa.', 'frame', 'legendary', 2000, 'frame:gold', true),
('Moldura Chamas', 'Uma moldura envolta em fogo. Para os que estão em chamas!', 'frame', 'epic', 1200, 'frame:fire', true),
('Moldura Galáxia', 'Partículas cósmicas girando ao redor do seu avatar.', 'frame', 'mythic', 5000, 'frame:galaxy', true),
('Moldura Prateada', 'Elegância em prata para os veteranos da equipe.', 'frame', 'rare', 800, 'frame:silver', true),

-- === BANNERS ===
('Banner Aurora', 'Fundo degradê aurora boreal em tons de verde e roxo.', 'banner', 'epic', 1500, 'banner:aurora', true),
('Banner Noite Estrelada', 'Fundo noturno com estrelas cintilantes.', 'banner', 'rare', 700, 'banner:night', true),
('Banner Chamas Épicas', 'Um fundo de brasas e fogo para os guerreiros do ranking.', 'banner', 'legendary', 3000, 'banner:flames', true),
('Banner Oceano', 'Ondas suaves em azul profundo. Calmo e profissional.', 'banner', 'common', 300, 'banner:ocean', true),
('Banner Ciberpunk', 'Neon, futurismo e grade de luz. O futuro do trabalho.', 'banner', 'mythic', 6000, 'banner:cyber', true)

ON CONFLICT DO NOTHING;
