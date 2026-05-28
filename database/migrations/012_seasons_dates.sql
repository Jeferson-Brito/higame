-- ============================================================
-- HIGAME — Migration 012: Datas nas Temporadas
-- ============================================================

ALTER TABLE seasons
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE;

-- Definir datas padrão para as temporadas já existentes
-- Vamos usar o mês e o ano que já existem
UPDATE seasons
SET 
  start_date = (year || '-' || lpad(month::text, 2, '0') || '-01')::DATE,
  end_date = (year || '-' || lpad(month::text, 2, '0') || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day';

-- Agora tornamos os campos NOT NULL
ALTER TABLE seasons
ALTER COLUMN start_date SET NOT NULL,
ALTER COLUMN end_date SET NOT NULL;
