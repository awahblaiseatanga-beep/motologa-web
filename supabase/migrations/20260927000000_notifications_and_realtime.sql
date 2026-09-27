-- ==============================================================================
-- MOTOLOGA PHASE 3: REALTIME & NOTIFICATION INFRASTRUCTURE
-- Timestamp: 2026-09-27
-- Summary: Deploys strictly typed notifications table, secure garage_events 
--          realtime relay, and the zero-trust private.is_garage_member helper.
-- ==============================================================================

-- 1. ZERO-TRUST CALLER-BOUND GARAGE MEMBERSHIP HELPER
-- Implements the RLS authorization boundary protecting the realtime transport.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_garage_member(p_garage_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.garage_members
    WHERE user_id = (SELECT auth.uid())
      AND garage_id = p_garage_id
  );
$$;

-- Execution Privileges (RLS Internal Use Only)
REVOKE ALL ON FUNCTION private.is_garage_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_garage_member(UUID) TO authenticated;


-- 2. GARAGE_EVENTS RELAY TABLE
-- Funnels domain events securely over realtime without polluting business data.
CREATE TABLE public.garage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
    table_name VARCHAR NOT NULL,
    record_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing & Rentention
CREATE INDEX idx_garage_events_garage_id ON public.garage_events(garage_id);
CREATE INDEX idx_garage_events_created_at ON public.garage_events(created_at);

-- RLS Enforcement
ALTER TABLE public.garage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "garage_events_select" ON public.garage_events
FOR SELECT TO authenticated
USING (
  (SELECT private.is_garage_member(garage_id))
);

-- NOTA BENE: No INSERT/UPDATE/DELETE policies are created for garage_events.
-- Thus, client writes are inherently blocked. Only SECURITY DEFINER POSTGRES TRIGGERS
-- will insert into this table.


-- 3. NOTIFICATIONS TABLE
-- Persistent user notification history
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL,
    actor_user_id UUID,
    type VARCHAR NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id);
CREATE INDEX idx_notifications_garage ON public.notifications(garage_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- RLS Enforcement
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_views_notifications" ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = recipient_user_id);

-- NOTA BENE: No generalized INSERT/UPDATE/DELETE client policies either.

-- 4. SECURE READ RPC
-- The only way a client can modify a notification is by marking it read via RPC.
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.notifications
    SET read_at = now()
    WHERE id = p_notification_id
      AND recipient_user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;


-- 5. REALTIME PUBLICATION MAPPING
-- Supabase automatically provisions 'supabase_realtime' publication.
-- We must explicitly attach our isolated tables to it.
BEGIN;
  -- Remove tables if they exist in the publication to prevent duplicate errors
  -- (We will add them cleanly)
  
  -- Supabase typically uses a publication named "supabase_realtime"
  -- It's best practice to conditionally ALTER PUBLICATION only if it exists.
  DO $$
  BEGIN
      IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
          ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
          ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
          ALTER PUBLICATION supabase_realtime ADD TABLE public.garage_members;
          ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
          ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
          ALTER PUBLICATION supabase_realtime ADD TABLE public.garage_events;
      END IF;
  EXCEPTION WHEN duplicate_object THEN
      -- Ignore if they're already added
  END $$;
COMMIT;
