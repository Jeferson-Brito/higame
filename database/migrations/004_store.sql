-- ============================================================
-- HIGAME — Migration 004: Loja de Recompensas e Ajustes
-- ============================================================

-- 1. Status de Compras na Loja
CREATE TYPE purchase_status AS ENUM ('pending', 'fulfilled', 'rejected');

ALTER TABLE employee_purchases
ADD COLUMN status purchase_status NOT NULL DEFAULT 'pending',
ADD COLUMN fulfilled_at TIMESTAMPTZ,
ADD COLUMN notes TEXT; -- Para o gestor deixar um recado (ex: "Folga agendada para sexta")

-- 2. Inserindo Itens Padrão na Loja
-- Garantindo que o tipo 'real_reward' existe (criado na migration 003)
INSERT INTO store_items (name, description, type, rarity, price_coins, asset_url)
VALUES 
  ('1 Dia de Folga', 'Troque suas HiCoins por um merecido day off (sujeito a agendamento com o gestor).', 'real_reward', 'mythic', 5000, '🏝️'),
  ('Chegar 2h mais tarde', 'Durma um pouco mais! Bônus de 2 horas de atraso abonado.', 'real_reward', 'legendary', 1000, '⏰'),
  ('Sair 2h mais cedo', 'Vá curtir o final de tarde! Bônus de 2 horas de saída antecipada.', 'real_reward', 'legendary', 1000, '🏃'),
  ('R$ 100 de Bônus', 'Resgate em dinheiro ou Pix (pago no próximo holerite).', 'real_reward', 'epic', 3000, '💸'),
  ('Ifood R$ 50', 'Um voucher do Ifood para o lanche do final de semana.', 'real_reward', 'rare', 1500, '🍔'),
  ('Brinde Misterioso', 'Sorteie um prêmio físico surpresa do RH!', 'real_reward', 'epic', 2000, '🎁');

-- 3. Inserindo Badges (Medalhas) Padrão
INSERT INTO badges (name, description, icon, rarity, xp_reward, coin_reward, condition_type)
VALUES
  ('Primeiro Ouro', 'Conquiste tier Ouro em qualquer KPI pela primeira vez.', '🏆', 'rare', 100, 50, 'first_gold'),
  ('Semana Impecável', 'Mantenha todos os KPIs no Ouro ou Prata por 7 dias.', '🔥', 'epic', 500, 200, 'perfect_week'),
  ('Lenda da Produtividade', 'Fique no Top 1 do Ranking em uma Temporada concluída.', '👑', 'mythic', 2000, 1000, 'season_winner'),
  ('Defensor da Qualidade', 'Mantenha TME abaixo da meta e NPS acima de 4.8 por 15 dias.', '🛡️', 'legendary', 1000, 500, 'quality_defender'),
  ('Iniciante', 'Complete seu perfil e faça seu primeiro login.', '🌟', 'common', 50, 10, 'first_login');
