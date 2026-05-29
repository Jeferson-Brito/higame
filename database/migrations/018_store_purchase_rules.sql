-- ============================================================
-- Atualiza a trigger de compra para:
-- 1. Checar purchase_limit do item.
-- 2. Auto-aprovar itens de 0 HC (Grátis).
-- ============================================================

CREATE OR REPLACE FUNCTION process_store_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_item_price INTEGER;
  v_item_limit INTEGER;
  v_current_balance INTEGER;
  v_purchase_count INTEGER;
BEGIN
  -- Descobre o preço do item e o limite
  SELECT price_coins, purchase_limit INTO v_item_price, v_item_limit 
  FROM store_items 
  WHERE id = NEW.item_id;
  
  -- Checa limite de compra
  IF v_item_limit IS NOT NULL AND v_item_limit > 0 THEN
    SELECT COUNT(*) INTO v_purchase_count 
    FROM employee_purchases 
    WHERE employee_id = NEW.employee_id AND item_id = NEW.item_id;
    
    IF v_purchase_count >= v_item_limit THEN
      RAISE EXCEPTION 'Limite de compras atingido para este item.';
    END IF;
  END IF;

  -- Descobre o saldo atual do colaborador
  SELECT coins_balance INTO v_current_balance 
  FROM profiles 
  WHERE id = NEW.employee_id;
  
  -- Verifica se tem saldo
  IF v_current_balance < v_item_price THEN
    RAISE EXCEPTION 'Saldo insuficiente para a compra.';
  END IF;

  -- Desconta o valor do perfil
  IF v_item_price > 0 THEN
    UPDATE profiles 
    SET coins_balance = coins_balance - v_item_price 
    WHERE id = NEW.employee_id;
  END IF;

  -- Auto-aprovar se o item for grátis (0 HC)
  IF v_item_price = 0 THEN
    NEW.status = 'fulfilled';
    NEW.fulfilled_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
