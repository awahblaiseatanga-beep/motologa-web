-- Migration: Make appointments.issue_description nullable and add voice_note_url

ALTER TABLE appointments 
  ALTER COLUMN issue_description DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS voice_note_url TEXT;

-- Enforce the Multimodal Invariant gracefully: at least text or voice MUST exist
ALTER TABLE appointments 
  ADD CONSTRAINT appointments_has_narrative_content 
  CHECK (
    length(trim(coalesce(issue_description, ''))) > 0
    OR voice_note_url IS NOT NULL
  );

-- Replace the atomic promotion RPC to properly map native voice tracking dynamically
CREATE OR REPLACE FUNCTION public.promote_finding_to_appointment(
    p_finding_id UUID,
    p_department_id UUID,
    p_scheduled_date DATE,
    p_scheduled_time TIME,
    p_issue_description TEXT DEFAULT NULL
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
    
    v_voice_note_url TEXT;
BEGIN
    SELECT parent_job_id, status, worker_voice_note_url INTO v_parent_job_id, v_finding_status, v_voice_note_url
    FROM public.additional_findings 
    WHERE id = p_finding_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment Creation Failed: The specified finding does not exist.';
    END IF;

    IF v_finding_status NOT IN ('pending_approval', 'pending_customer') THEN
        RAISE EXCEPTION 'Appointment Creation Failed: Invalid finding state (%). Must be awaiting approval.', v_finding_status;
    END IF;

    SELECT garage_id, customer_id, vehicle_id 
    INTO v_garage_id, v_customer_id, v_vehicle_id
    FROM public.jobs 
    WHERE id = v_parent_job_id;

    IF NOT EXISTS (SELECT 1 FROM public.departments WHERE id = p_department_id AND garage_id = v_garage_id) THEN
        RAISE EXCEPTION 'Security Violation: Provided department does not belong to the Job Garage.';
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.garages WHERE owner_id = auth.uid() AND id = v_garage_id) INTO v_is_owner;
    SELECT EXISTS(SELECT 1 FROM public.garage_members WHERE user_id = auth.uid() AND role = 'hod' AND department_id = p_department_id) INTO v_is_hod;
    
    IF NOT v_is_owner AND NOT v_is_hod THEN
        RAISE EXCEPTION 'RLS Violation: You are not explicitly authorized to schedule appointments across this specific department/garage.';
    END IF;

    INSERT INTO public.appointments (
        garage_id, department_id, customer_id, vehicle_id, 
        scheduled_date, scheduled_time, issue_description, voice_note_url,
        source, source_job_id, source_finding_id, status
    ) VALUES (
        v_garage_id, p_department_id, v_customer_id, v_vehicle_id, 
        p_scheduled_date, p_scheduled_time, p_issue_description, v_voice_note_url,
        'additional_finding', v_parent_job_id, p_finding_id, 'scheduled'
    ) RETURNING id INTO v_appointment_id;

    UPDATE public.additional_findings 
    SET status = 'scheduled' 
    WHERE id = p_finding_id;

    RETURN v_appointment_id;
END;
$$;
