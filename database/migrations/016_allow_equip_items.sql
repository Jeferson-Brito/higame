-- ============================================================
-- Atualiza a função enforce_employee_profile_update para permitir
-- que o usuário altere seus itens equipados (title, frame, banner)
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_employee_profile_update()
RETURNS TRIGGER AS $$
BEGIN
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
