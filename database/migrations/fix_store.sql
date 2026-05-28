-- ============================================================
-- SCRIPT DE CORREÇÃO (Rode este arquivo no Supabase)
-- ============================================================

-- 1. Cria o tipo ignorando o erro se já existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
    CREATE TYPE purchase_status AS ENUM ('pending', 'fulfilled', 'rejected');
  END IF;
END $$;

-- 2. Adiciona as colunas (se não existirem)
ALTER TABLE employee_purchases
ADD COLUMN IF NOT EXISTS status purchase_status NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Permite que o colaborador possa "comprar" (RLS)
DROP POLICY IF EXISTS "employee_insert_own_purchases" ON employee_purchases;
CREATE POLICY "employee_insert_own_purchases" ON employee_purchases
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

-- 4. Insere os Itens na Loja (apenas se a tabela estiver vazia)
INSERT INTO store_items (name, description, type, rarity, price_coins, asset_url)
SELECT '1 Dia de Folga', 'Troque suas HiCoins por um merecido day off (sujeito a agendamento com o gestor).', 'real_reward', 'mythic', 5000, '🏝️'
WHERE NOT EXISTS (SELECT 1 FROM store_items LIMIT 1);

INSERT INTO store_items (name, description, type, rarity, price_coins, asset_url)
SELECT 'Chegar 2h mais tarde', 'Durma um pouco mais! Bônus de 2 horas de atraso abonado.', 'real_reward', 'legendary', 1000, '⏰'
WHERE NOT EXISTS (SELECT 1 FROM store_items WHERE name = 'Chegar 2h mais tarde');

INSERT INTO store_items (name, description, type, rarity, price_coins, asset_url)
SELECT 'Sair 2h mais cedo', 'Vá curtir o final de tarde! Bônus de 2 horas de saída antecipada.', 'real_reward', 'legendary', 1000, '🏃'
WHERE NOT EXISTS (SELECT 1 FROM store_items WHERE name = 'Sair 2h mais cedo');

INSERT INTO store_items (name, description, type, rarity, price_coins, asset_url)
SELECT 'R$ 100 de Bônus', 'Resgate em dinheiro ou Pix (pago no próximo holerite).', 'real_reward', 'epic', 3000, '💸'
WHERE NOT EXISTS (SELECT 1 FROM store_items WHERE name = 'R$ 100 de Bônus');

INSERT INTO store_items (name, description, type, rarity, price_coins, asset_url)
SELECT 'Ifood R$ 50', 'Um voucher do Ifood para o lanche do final de semana.', 'real_reward', 'rare', 1500, '🍔'
WHERE NOT EXISTS (SELECT 1 FROM store_items WHERE name = 'Ifood R$ 50');

INSERT INTO store_items (name, description, type, rarity, price_coins, asset_url)
SELECT 'Brinde Misterioso', 'Sorteie um prêmio físico surpresa do RH!', 'real_reward', 'epic', 2000, '🎁'
WHERE NOT EXISTS (SELECT 1 FROM store_items WHERE name = 'Brinde Misterioso');

-- 5. Insere as Badges Padrão (apenas se a tabela estiver vazia)
INSERT INTO badges (name, description, icon, rarity, xp_reward, coin_reward, condition_type)
SELECT 'Primeiro Ouro', 'Conquiste tier Ouro em qualquer KPI pela primeira vez.', '🏆', 'rare', 100, 50, 'first_gold'
WHERE NOT EXISTS (SELECT 1 FROM badges LIMIT 1);

INSERT INTO badges (name, description, icon, rarity, xp_reward, coin_reward, condition_type)
SELECT 'Semana Impecável', 'Mantenha todos os KPIs no Ouro ou Prata por 7 dias.', '🔥', 'epic', 500, 200, 'perfect_week'
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Semana Impecável');

INSERT INTO badges (name, description, icon, rarity, xp_reward, coin_reward, condition_type)
SELECT 'Lenda da Produtividade', 'Fique no Top 1 do Ranking em uma Temporada concluída.', '👑', 'mythic', 2000, 1000, 'season_winner'
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Lenda da Produtividade');

INSERT INTO badges (name, description, icon, rarity, xp_reward, coin_reward, condition_type)
SELECT 'Defensor da Qualidade', 'Mantenha TME abaixo da meta e NPS acima de 4.8 por 15 dias.', '🛡️', 'legendary', 1000, 500, 'quality_defender'
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Defensor da Qualidade');

INSERT INTO badges (name, description, icon, rarity, xp_reward, coin_reward, condition_type)
SELECT 'Iniciante', 'Complete seu perfil e faça seu primeiro login.', '🌟', 'common', 50, 10, 'first_login'
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Iniciante');
