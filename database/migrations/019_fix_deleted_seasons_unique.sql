-- ============================================================
-- HIGAME — Migration 019: Corrige a restrição única de temporada
-- ============================================================

-- Remove a restrição única antiga que impedia criar temporadas
-- para o mesmo mês/ano mesmo se a antiga estivesse "excluída" (soft delete)
ALTER TABLE seasons DROP CONSTRAINT IF EXISTS seasons_month_year_key;

-- Cria um índice único parcial que considera apenas temporadas ativas (não excluídas)
CREATE UNIQUE INDEX seasons_month_year_unique_idx 
ON seasons (month, year) 
WHERE deleted_at IS NULL;
