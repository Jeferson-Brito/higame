-- ============================================================
-- HIGAME — Migration 011: Sistema de Notificações
-- ============================================================

-- ============================================================

-- 1. Cria o tipo de notificação
CREATE TYPE notification_type AS ENUM (
  'store_approved',
  'store_rejected',
  'badge_earned',
  'quest_completed',
  'level_up',
  'profile_view',
  'reward',
  'system'
);

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  type          notification_type NOT NULL DEFAULT 'system',
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver suas próprias notificações
CREATE POLICY "employee_select_notifications" ON notifications
  FOR SELECT USING (auth.uid() = profile_id);

-- Usuário pode marcar suas próprias notificações como lidas
CREATE POLICY "employee_update_notifications" ON notifications
  FOR UPDATE USING (auth.uid() = profile_id);

-- O sistema/admin pode inserir notificações para os usuários
-- (A própria trigger que roda com SECURITY DEFINER vai bypassar o RLS)
-- Mas para inserts diretos pelo admin via frontend:
CREATE POLICY "admin_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (is_admin());

-- Para a notificação de 'visita', qualquer usuário autenticado pode
-- inserir uma notificação (ex: "Jeferson visitou seu perfil").
CREATE POLICY "authenticated_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Índices para performance (buscar não lidas)
CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_unread ON notifications(profile_id) WHERE is_read = FALSE;

-- ============================================================
-- Atualização no Ranking para mostrar o Multiplicador Visível
-- ============================================================

ALTER TABLE rankings
ADD COLUMN current_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00;

