-- ============================================================
-- HIGAME — Seed: Dados Iniciais
-- Execute APÓS as Migrations 001 e 002
-- ============================================================

-- ============================================================
-- APP_SETTINGS: Configurações padrão do sistema
-- ============================================================

INSERT INTO app_settings (key, value, description) VALUES

  -- XP base por tier
  ('xp_gold',    '100', 'XP concedido ao atingir tier Ouro em um KPI'),
  ('xp_silver',   '70', 'XP concedido ao atingir tier Prata em um KPI'),
  ('xp_bronze',   '40', 'XP concedido ao atingir tier Bronze em um KPI'),
  ('xp_out',       '0', 'XP concedido ao ficar fora da meta'),

  -- Multiplicadores
  ('multiplier_all_gold',     '1.50', 'Multiplicador quando TODOS os KPIs são Ouro (+50%)'),
  ('multiplier_improvement',  '1.20', 'Multiplicador por evolução vs. mês anterior (+20%)'),

  -- Níveis
  ('xp_per_level', '1000', 'XP necessário por nível (ex: nível 5 = 5000 XP acumulados)'),

  -- Visual
  ('app_name',      '"HIGAME"',        'Nome da plataforma'),
  ('app_tagline',   '"Gamificação Corporativa"', 'Tagline da plataforma');

-- ============================================================
-- Nota: usuários e temporadas de demonstração devem ser criados
-- pelo painel admin após configurar o Supabase Auth.
--
-- Para criar o primeiro usuário admin:
-- 1. Registre o usuário via Supabase Auth (Authentication > Users)
-- 2. Execute o UPDATE abaixo com o UUID do usuário criado:
--
-- UPDATE profiles SET role = 'admin' WHERE id = 'UUID-DO-USUARIO-AQUI';
-- ============================================================
