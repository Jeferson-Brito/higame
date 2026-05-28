-- ============================================================
-- HIGAME — Migration 013: Social Feed
-- ============================================================

CREATE TABLE feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'badge_earned', 'item_purchased', 'level_up', 'quest_completed', 'streak_milestone'
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Todos podem ver o feed (já que é público para a empresa)
CREATE POLICY "anyone_can_read_feed" ON feed_events
  FOR SELECT USING (true);

-- Apenas admins podem inserir (ou inserções do sistema bypassing RLS / via trigger / via backend com service role)
-- Como o Supabase Data API executa como authenticated, e às vezes o próprio usuário que insere (ex: ao completar missão ou na auth),
-- vamos permitir insert por qualquer user autenticado, mas com segurança no app.
CREATE POLICY "authenticated_can_insert_feed" ON feed_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- TRIGGERS DE ALIMENTAÇÃO DO FEED
-- ============================================================

-- 1. Quando ganha Badge
CREATE OR REPLACE FUNCTION trigger_feed_on_badge()
RETURNS TRIGGER AS $$
DECLARE
  badge_name TEXT;
  badge_icon TEXT;
  badge_rarity TEXT;
BEGIN
  SELECT name, icon, rarity INTO badge_name, badge_icon, badge_rarity FROM badges WHERE id = NEW.badge_id;
  
  INSERT INTO feed_events (profile_id, event_type, event_data)
  VALUES (
    NEW.employee_id, 
    'badge_earned', 
    jsonb_build_object(
      'badge_name', badge_name,
      'badge_icon', badge_icon,
      'badge_rarity', badge_rarity
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_employee_badge_insert
  AFTER INSERT ON employee_badges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_feed_on_badge();


-- 2. Quando compra item (Status = Fulfilled)
CREATE OR REPLACE FUNCTION trigger_feed_on_purchase_fulfilled()
RETURNS TRIGGER AS $$
DECLARE
  item_name TEXT;
  item_type TEXT;
  item_rarity TEXT;
BEGIN
  -- Apenas quando o status muda para fulfilled
  IF NEW.status = 'fulfilled' AND (OLD.status IS NULL OR OLD.status != 'fulfilled') THEN
    SELECT name, type, rarity INTO item_name, item_type, item_rarity FROM store_items WHERE id = NEW.item_id;
    
    INSERT INTO feed_events (profile_id, event_type, event_data)
    VALUES (
      NEW.employee_id, 
      'item_purchased', 
      jsonb_build_object(
        'item_name', item_name,
        'item_type', item_type,
        'item_rarity', item_rarity
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_employee_purchase_update
  AFTER UPDATE ON employee_purchases
  FOR EACH ROW
  EXECUTE FUNCTION trigger_feed_on_purchase_fulfilled();

-- ============================================================
-- ATUALIZAÇÃO DA TABELA PROFILES PARA LOGIN STREAK
-- ============================================================
-- Garantir que as colunas existam (migration 003 já adicionou)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
