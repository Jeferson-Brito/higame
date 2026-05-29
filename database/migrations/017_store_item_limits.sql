-- ============================================================
-- Adiciona limite de compra (purchase_limit) na loja
-- ============================================================

ALTER TABLE store_items
ADD COLUMN purchase_limit INTEGER DEFAULT NULL;

COMMENT ON COLUMN store_items.purchase_limit IS 'Limite de vezes que um colaborador pode resgatar/comprar esse item. NULL = sem limite.';
