-- ==============================================================================
-- MOTOLOGA PHASE 2: APPOINTMENTS DOMAIN SCHEMA & HARDENING
-- Timestamp: 2026-09-24
-- Summary: Deploys strictly typed Appointments schema, Idempotency constraints,
--          Deep RLS filtering, and the robust `promote_finding_to_appointment` RPC.
-- ==============================================================================

-- 1. REFERENTIAL RETENTION AUDIT APPLIED
-- Critical infrastructure (departments, customers, vehicles, jobs) defaults to RESTRICT or SET NULL
-- avoiding cascade destructions of historical metrics unless explicitly orphaned.

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    
    -- Client & Vehicle (Derived securely backend-only, never frontend-trusted)
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    
    -- Description & Traceability
    issue_description TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('additional_finding', 'direct_booking', 'checkout')),
    source_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    source_finding_id UUID REFERENCES public.additional_findings(id) ON DELETE SET NULL,
    
    -- Lifecycle Matrix
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'cancelled', 'no_show', 'converted_to_job')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. INDEXING & IDEMPOTENCY BOUNDARIES
CREATE INDEX idx_appointments_garage_dept ON public.appointments(garage_id, department_id);
CREATE INDEX idx_appointments_scheduled_date ON public.appointments(scheduled_date);

-- DOUBLE-CLICK PROTECTION: A single finding cannot accidentally spawn multiple appointments
CREATE UNIQUE INDEX idx_appointments_unique_finding 
ON public.appointments(source_finding_id) 
WHERE source_finding_id IS NOT NULL;


-- 3. ATOMIC RPC COMPONENT & DERIVED STATES
CREATE OR REPLACE FUNCTION public.promote_finding_to_appointment(
    p_finding_id UUID,
    p_department_id UUID,
    p_scheduled_date DATE,
    p_scheduled_time TIME,
    p_issue_description TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_appointment_id UUID;
    v_parent_job_id UUID;
    v_finding_status TEXT;
    
    v_garage_id UUID;
    v_customer_id UUID;
    v_vehicle_id UUID;
    
    v_is_owner BOOLEAN;
    v_is_hod BOOLEAN;
BEGIN
    -- [A] FINDING STATE VALIDATION & EXTRACTION
    SELECT parent_job_id, status INTO v_parent_job_id, v_finding_status
    FROM public.additional_findings 
    WHERE id = p_finding_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment Creation Failed: The specified finding does not exist.';
    END IF;

    IF v_finding_status NOT IN ('pending_approval', 'pending_customer') THEN
        RAISE EXCEPTION 'Appointment Creation Failed: Invalid finding state (%). Must be awaiting approval.', v_finding_status;
    END IF;

    -- [B] AUTHORITATIVE DERIVATION (Trusting DB constraints, not frontend args)
    SELECT garage_id, customer_id, vehicle_id 
    INTO v_garage_id, v_customer_id, v_vehicle_id
    FROM public.jobs 
    WHERE id = v_parent_job_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data Corruption: Attached parent job references critical missing data.';
    END IF;

    -- [C] DEPARTMENTAL VERIFICATION
    -- Ensure the department explicitly requested actually belongs to this garage natively!
    IF NOT EXISTS (SELECT 1 FROM public.departments WHERE id = p_department_id AND garage_id = v_garage_id) THEN
        RAISE EXCEPTION 'Security Violation: Provided department does not belong to the Job Garage.';
    END IF;

    -- [D] AUTHENTICATED ACCESS MATRIX (Caller Authority Check)
    SELECT EXISTS(SELECT 1 FROM public.garages WHERE owner_id = auth.uid() AND id = v_garage_id) INTO v_is_owner;
    SELECT EXISTS(SELECT 1 FROM public.garage_members WHERE user_id = auth.uid() AND role = 'hod' AND department_id = p_department_id) INTO v_is_hod;
    
    IF NOT v_is_owner AND NOT v_is_hod THEN
        RAISE EXCEPTION 'RLS Violation: You are not explicitly authorized to schedule appointments across this specific department/garage.';
    END IF;

    -- [E] ISOLATED TRANSACTION INSERTION
    INSERT INTO public.appointments (
        garage_id, department_id, customer_id, vehicle_id, 
        scheduled_date, scheduled_time, issue_description,
        source, source_job_id, source_finding_id, status
    ) VALUES (
        v_garage_id, p_department_id, v_customer_id, v_vehicle_id, 
        p_scheduled_date, p_scheduled_time, p_issue_description,
        'additional_finding', v_parent_job_id, p_finding_id, 'scheduled'
    ) RETURNING id INTO v_appointment_id;

    -- [F] MUTATE NATIVE FINDING QUEUE
    UPDATE public.additional_findings 
    SET status = 'scheduled' 
    WHERE id = p_finding_id;

    RETURN v_appointment_id;
END;
$$;

-- PRIVILEGE LOCKDOWN
REVOKE ALL ON FUNCTION public.promote_finding_to_appointment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_finding_to_appointment TO authenticated;


-- 4. GRANULAR RLS MATRIX ENFORCEMENT
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Owner: Universal READ/WRITE capabilities specifically isolated to their active businesses natively
CREATE POLICY "owner_views_appointments" ON public.appointments
FOR SELECT TO authenticated
USING (garage_id IN (SELECT id FROM public.garages WHERE owner_id = auth.uid()));

CREATE POLICY "owner_inserts_appointments" ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (garage_id IN (SELECT id FROM public.garages WHERE owner_id = auth.uid()));

CREATE POLICY "owner_updates_appointments" ON public.appointments
FOR UPDATE TO authenticated
USING (garage_id IN (SELECT id FROM public.garages WHERE owner_id = auth.uid()))
WITH CHECK (garage_id IN (SELECT id FROM public.garages WHERE owner_id = auth.uid()));


-- HOD: Constrained aggressively targeting solely their authorized Departmental pool naturally
CREATE POLICY "hod_views_appointments" ON public.appointments
FOR SELECT TO authenticated
USING (
    department_id IN (SELECT department_id FROM public.garage_members WHERE user_id = auth.uid() AND role = 'hod' AND garage_id = appointments.garage_id)
);

CREATE POLICY "hod_inserts_appointments" ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (
    department_id IN (SELECT department_id FROM public.garage_members WHERE user_id = auth.uid() AND role = 'hod' AND garage_id = appointments.garage_id)
);

CREATE POLICY "hod_updates_appointments" ON public.appointments
FOR UPDATE TO authenticated
USING (
    department_id IN (SELECT department_id FROM public.garage_members WHERE user_id = auth.uid() AND role = 'hod' AND garage_id = appointments.garage_id)
)
WITH CHECK (
    department_id IN (SELECT department_id FROM public.garage_members WHERE user_id = auth.uid() AND role = 'hod' AND garage_id = appointments.garage_id)
);
