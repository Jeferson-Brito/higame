-- ============================================================
-- HIGAME — Migration 020: Auto Fulfill Cosmetics
-- ============================================================
-- Atualiza a trigger de compra para auto-aprovar itens digitais (cosméticos)
-- além de itens gratuitos.

CREATE OR REPLACE FUNCTION process_store_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_item_price INTEGER;
  v_item_limit INTEGER;
  v_item_type item_type;
  v_current_balance INTEGER;
  v_purchase_count INTEGER;
BEGIN
  -- Descobre o preço, limite e tipo do item
  SELECT price_coins, purchase_limit, type INTO v_item_price, v_item_limit, v_item_type 
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

  -- Auto-aprovar se o item for grátis (0 HC) ou for um item digital (cosmético)
  IF v_item_price = 0 OR v_item_type IN ('frame', 'banner', 'title') THEN
    NEW.status = 'fulfilled';
    NEW.fulfilled_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Adicional: Atualizar as compras passadas que eram cosméticos mas ficaram pendentes
UPDATE employee_purchases ep
SET status = 'fulfilled', fulfilled_at = now()
FROM store_items si
WHERE ep.item_id = si.id 
  AND ep.status = 'pending'
  AND si.type IN ('frame', 'banner', 'title');
