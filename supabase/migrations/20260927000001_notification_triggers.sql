-- ==============================================================================
-- MOTOLOGA PHASE 3: NOTIFICATION & LIFECYCLE EVENT TRIGGERS
-- Timestamp: 2026-09-27
-- Summary: Binds rigorous PostgreSQL state transition logic to Notification 
--          generation and secure `garage_events` relay logging.
-- ==============================================================================

-- ==============================================================================
-- 1. JOBS LIFECYCLE TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_job_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    SELECT owner_id INTO v_owner_id FROM public.garages WHERE id = NEW.garage_id;

    -- JOB_ASSIGNED
    IF OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL THEN
        IF NEW.assigned_to IS DISTINCT FROM auth.uid() THEN
            INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
            VALUES (NEW.garage_id, NEW.assigned_to, auth.uid(), 'JOB_ASSIGNED', 'New Job Assigned', 'You have been assigned to job ' || COALESCE(NEW.plate, 'Unknown'), 'job', NEW.id);
        END IF;
    END IF;

    -- JOB_REASSIGNED
    IF OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
        IF NEW.assigned_to IS DISTINCT FROM auth.uid() THEN
            INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
            VALUES (NEW.garage_id, NEW.assigned_to, auth.uid(), 'JOB_REASSIGNED', 'Job Reassigned to You', 'You have been reassigned to job ' || COALESCE(NEW.plate, 'Unknown'), 'job', NEW.id);
        END IF;
    END IF;

    -- JOB_SUBMITTED_FOR_REVIEW
    IF NEW.hod_review_pending = true AND (OLD.hod_review_pending = false OR OLD.hod_review_pending IS NULL) THEN
        -- Notify Owner (For scale, this should include Dept HODs but we notify Owner as root fallback based on plan)
        IF v_owner_id IS DISTINCT FROM auth.uid() THEN
             INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
             VALUES (NEW.garage_id, v_owner_id, auth.uid(), 'JOB_SUBMITTED_FOR_REVIEW', 'QC Review Required', 'A job is ready for review: ' || COALESCE(NEW.plate, 'Unknown'), 'job', NEW.id);
        END IF;
    END IF;

    -- JOB_APPROVED
    IF NEW.status IN ('COMPLETED', 'completed') AND NEW.hod_review_pending = false AND OLD.hod_review_pending = true THEN
         IF NEW.assigned_to IS DISTINCT FROM auth.uid() AND NEW.assigned_to IS NOT NULL THEN
             INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
             VALUES (NEW.garage_id, NEW.assigned_to, auth.uid(), 'JOB_APPROVED', 'Job Quality Approved', 'Your work was approved for ' || COALESCE(NEW.plate, 'Unknown'), 'job', NEW.id);
         END IF;
    END IF;

    -- JOB_REJECTED (Bounced from review back to active repair)
    IF NEW.status IN ('IN_PROGRESS', 'in_progress') AND NEW.hod_review_pending = false AND OLD.hod_review_pending = true THEN
         IF NEW.assigned_to IS DISTINCT FROM auth.uid() AND NEW.assigned_to IS NOT NULL THEN
             INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
             VALUES (NEW.garage_id, NEW.assigned_to, auth.uid(), 'JOB_REJECTED', 'Job Rejected (Needs Adjustment)', 'Review notes provided for ' || COALESCE(NEW.plate, 'Unknown'), 'job', NEW.id);
         END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_notifications ON public.jobs;
CREATE TRIGGER trg_job_notifications
    AFTER UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_job_notifications();


-- ==============================================================================
-- 2. ADDITIONAL FINDINGS (NOTIFICATIONS + RELAY EVENTS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_additional_findings_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_garage_id UUID;
    v_owner_id UUID;
    v_assigned_to UUID;
    v_parent_plate TEXT;
BEGIN
    -- Derive parent job context
    SELECT garage_id, assigned_to, plate INTO v_garage_id, v_assigned_to, v_parent_plate 
    FROM public.jobs WHERE id = COALESCE(NEW.parent_job_id, OLD.parent_job_id);

    SELECT owner_id INTO v_owner_id FROM public.garages WHERE id = v_garage_id;

    -- Write Relay Event for Frontend Realtime Synchronization Layer
    INSERT INTO public.garage_events (garage_id, table_name, record_id)
    VALUES (v_garage_id, 'additional_findings', COALESCE(NEW.id, OLD.id));

    -- NOTIFICATIONS
    IF TG_OP = 'INSERT' THEN
        -- ADDITIONAL_FINDING_SUBMITTED -> Notify Owner/HOD
        IF v_owner_id IS DISTINCT FROM auth.uid() THEN
            INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
            VALUES (v_garage_id, v_owner_id, auth.uid(), 'ADDITIONAL_FINDING_SUBMITTED', 'New Finding Submitted', 'A new finding was submitted for ' || COALESCE(v_parent_plate, 'Unknown'), 'finding', NEW.id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- ADDITIONAL_WORK_APPROVED
        IF NEW.status = 'customer_approved' AND OLD.status IS DISTINCT FROM 'customer_approved' THEN
            IF v_assigned_to IS DISTINCT FROM auth.uid() AND v_assigned_to IS NOT NULL THEN
                INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
                VALUES (v_garage_id, v_assigned_to, auth.uid(), 'ADDITIONAL_WORK_APPROVED', 'Additional Work Approved', 'Work approved for ' || COALESCE(v_parent_plate, 'Unknown'), 'finding', NEW.id);
            END IF;
        END IF;

        -- ADDITIONAL_WORK_REJECTED
        IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
            IF v_assigned_to IS DISTINCT FROM auth.uid() AND v_assigned_to IS NOT NULL THEN
                INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
                VALUES (v_garage_id, v_assigned_to, auth.uid(), 'ADDITIONAL_WORK_REJECTED', 'Additional Work Rejected', 'Work rejected for ' || COALESCE(v_parent_plate, 'Unknown'), 'finding', NEW.id);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finding_events ON public.additional_findings;
CREATE TRIGGER trg_finding_events
    AFTER INSERT OR UPDATE ON public.additional_findings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_additional_findings_events();


-- ==============================================================================
-- 3. APPOINTMENTS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_appointment_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
    v_vehicle_plate TEXT;
BEGIN
    SELECT owner_id INTO v_owner_id FROM public.garages WHERE id = COALESCE(NEW.garage_id, OLD.garage_id);
    
    -- Optional context retrieval
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT plate INTO v_vehicle_plate FROM public.vehicles WHERE id = NEW.vehicle_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF v_owner_id IS DISTINCT FROM auth.uid() THEN
            INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
            VALUES (NEW.garage_id, v_owner_id, auth.uid(), 'APPOINTMENT_CREATED', 'New Appointment Scheduled', 'An appointment was booked' || COALESCE(' for ' || v_vehicle_plate, ''), 'appointment', NEW.id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- APPOINTMENT_CANCELLED
        IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
            IF v_owner_id IS DISTINCT FROM auth.uid() THEN
                INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
                VALUES (NEW.garage_id, v_owner_id, auth.uid(), 'APPOINTMENT_CANCELLED', 'Appointment Cancelled', 'An appointment was cancelled.', 'appointment', NEW.id);
            END IF;
        -- APPOINTMENT_RESCHEDULED
        ELSIF (NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date OR NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time) AND NEW.status IS DISTINCT FROM 'cancelled' THEN
            IF v_owner_id IS DISTINCT FROM auth.uid() THEN
                INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
                VALUES (NEW.garage_id, v_owner_id, auth.uid(), 'APPOINTMENT_RESCHEDULED', 'Appointment Rescheduled', 'An appointment was rescheduled.', 'appointment', NEW.id);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_events ON public.appointments;
CREATE TRIGGER trg_appointment_events
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_appointment_events();


-- ==============================================================================
-- 4. STAFF (GARAGE_MEMBERS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_staff_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
    v_member_name TEXT;
BEGIN
    SELECT owner_id INTO v_owner_id FROM public.garages WHERE id = COALESCE(NEW.garage_id, OLD.garage_id);

    IF TG_OP = 'INSERT' THEN
        -- STAFF_JOINED
        IF NEW.user_id = auth.uid() THEN
            -- Actor Exclusion Handle: Owner/Staff registering themselves drops circular self-notification
            RETURN NEW;
        END IF;
        
        IF v_owner_id IS DISTINCT FROM auth.uid() THEN
            INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
            VALUES (NEW.garage_id, v_owner_id, auth.uid(), 'STAFF_JOINED', 'New Staff Joined', 'A new member was added to the garage roster.', 'member', NEW.id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- STAFF_ROLE_CHANGED
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            IF v_owner_id IS DISTINCT FROM auth.uid() THEN
                INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
                VALUES (NEW.garage_id, v_owner_id, auth.uid(), 'STAFF_ROLE_CHANGED', 'Staff Role Altered', 'A roster member''s role was updated.', 'member', NEW.id);
            END IF;
            -- Notify member themselves if caller was someone else
            IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
                INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
                VALUES (NEW.garage_id, NEW.user_id, auth.uid(), 'STAFF_ROLE_CHANGED', 'Your Role Changed', 'Your access role was updated to ' || NEW.role, 'member', NEW.id);
            END IF;
        END IF;

        -- STAFF_DEPARTMENT_CHANGED
        IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
            IF v_owner_id IS DISTINCT FROM auth.uid() THEN
                INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
                VALUES (NEW.garage_id, v_owner_id, auth.uid(), 'STAFF_DEPARTMENT_CHANGED', 'Staff Department Altered', 'A roster member changed departments.', 'member', NEW.id);
            END IF;
            -- Notify member themselves if caller was someone else
            IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
                INSERT INTO public.notifications (garage_id, recipient_user_id, actor_user_id, type, title, message, entity_type, entity_id)
                VALUES (NEW.garage_id, NEW.user_id, auth.uid(), 'STAFF_DEPARTMENT_CHANGED', 'Your Department Changed', 'Your assigned department was updated.', 'member', NEW.id);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_events ON public.garage_members;
CREATE TRIGGER trg_staff_events
    AFTER INSERT OR UPDATE ON public.garage_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_staff_events();

-- ==============================================================================
-- 5. DEFERRED REPAIRS RELAY EVENTS 
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_deferred_repairs_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_garage_id UUID;
BEGIN
    SELECT garage_id INTO v_garage_id FROM public.jobs WHERE id = COALESCE(NEW.job_id, OLD.job_id);
    
    INSERT INTO public.garage_events (garage_id, table_name, record_id)
    VALUES (v_garage_id, 'deferred_repairs', COALESCE(NEW.id, OLD.id));

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deferred_events ON public.deferred_repairs;
CREATE TRIGGER trg_deferred_events
    AFTER INSERT OR UPDATE ON public.deferred_repairs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_deferred_repairs_events();
