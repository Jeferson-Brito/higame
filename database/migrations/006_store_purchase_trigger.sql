-- ============================================================
-- HIGAME — Migration 006: Trigger de Compra (Desconto de Coins)
-- ============================================================

-- Função que executa após uma inserção em employee_purchases
CREATE OR REPLACE FUNCTION process_store_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_item_price INTEGER;
  v_current_balance INTEGER;
BEGIN
  -- Descobre o preço do item que está sendo comprado
  SELECT price_coins INTO v_item_price FROM store_items WHERE id = NEW.item_id;
  
  -- Descobre o saldo atual do colaborador
  SELECT coins_balance INTO v_current_balance FROM profiles WHERE id = NEW.employee_id;
  
  -- Verifica se tem saldo (só por segurança dupla no banco)
  IF v_current_balance < v_item_price THEN
    RAISE EXCEPTION 'Saldo insuficiente para a compra.';
  END IF;

  -- Desconta o valor do perfil (como essa função roda no banco, ela burla a proteção de UPDATE do colaborador)
  UPDATE profiles 
  SET coins_balance = coins_balance - v_item_price 
  WHERE id = NEW.employee_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Associa a trigger à tabela
DROP TRIGGER IF EXISTS trigger_process_store_purchase ON employee_purchases;
CREATE TRIGGER trigger_process_store_purchase
  BEFORE INSERT ON employee_purchases
  FOR EACH ROW
  EXECUTE FUNCTION process_store_purchase();
