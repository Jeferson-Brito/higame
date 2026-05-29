-- ============================================================
-- SCRIPT DE CORREÇÃO PARA A LOJA
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_employee_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Se estamos atualizando via trigger interno, ignora as restrições
  IF current_setting('app.bypassing_profile_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Se quem está atualizando é o próprio usuário (não é um Admin fazendo alterações via painel admin)
  IF auth.uid() = OLD.id THEN
    -- Bloqueia a alteração de campos sensíveis
    IF NEW.role IS DISTINCT FROM OLD.role
      OR NEW.position IS DISTINCT FROM OLD.position
      OR NEW.team IS DISTINCT FROM OLD.team
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
      OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
      OR NEW.longest_streak IS DISTINCT FROM OLD.longest_streak
      OR NEW.last_login IS DISTINCT FROM OLD.last_login
      OR NEW.coins_balance IS DISTINCT FROM OLD.coins_balance
    THEN
      RAISE EXCEPTION 'Colaboradores só podem alterar nome, avatar e cosméticos equipados.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION process_store_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_item_price INTEGER;
  v_item_limit INTEGER;
  v_item_type TEXT;
  v_current_balance INTEGER;
  v_purchase_count INTEGER;
BEGIN
  -- 1. Obter informações do item
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

  -- 2. Verificar o saldo do usuário
  SELECT coins_balance INTO v_current_balance
  FROM profiles
  WHERE id = NEW.employee_id;

  IF v_current_balance < v_item_price THEN
    RAISE EXCEPTION 'Saldo insuficiente.';
  END IF;

  -- Subtrair o saldo do usuário com bypass de trigger
  IF v_item_price > 0 THEN
    PERFORM set_config('app.bypassing_profile_trigger', 'true', true);
    
    UPDATE profiles 
    SET coins_balance = coins_balance - v_item_price 
    WHERE id = NEW.employee_id;
    
    PERFORM set_config('app.bypassing_profile_trigger', '', true);
  END IF;

  -- Auto-aprovar se o item for grátis (0 HC) ou for um item digital (cosmético)
  IF v_item_price = 0 OR v_item_type IN ('frame', 'banner', 'title') THEN
    NEW.status = 'fulfilled';
    NEW.fulfilled_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
