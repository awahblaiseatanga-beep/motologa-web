-- =====================================================================================
-- MOTOLOGA PHASE 4 (Patch): BILINGUAL ARCHITECTURE - DEFINER RPC
-- Timestamp: 2026-09-28
-- Summary: Resolves 42503/42501 Forbidden faults tracking secure state mutations on
--          profiles.language_preference without exposing the profiles table directly
--          to malicious arbitrary UPDATE commands natively maintaining current security.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.set_language_preference(preference VARCHAR)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
BEGIN
  -- 1. Explict internal resolution of JWT target Context
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate input domain strictly
  IF preference IS NOT NULL AND preference NOT IN ('en', 'fr') THEN
    RAISE EXCEPTION 'Invalid language preference. Allowed values: en, fr, NULL';
  END IF;

  -- 3. Targeted execution natively bypassing broad table RLS while validating ownership.
  UPDATE public.profiles
  SET language_preference = preference
  WHERE user_id = v_uid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Identity profile bounded to this session not natively located.';
  END IF;
END;
$$;

-- Secure execution boundary mappings natively binding against standard JWT limits limits.
REVOKE ALL ON FUNCTION public.set_language_preference(VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_language_preference(VARCHAR) FROM anon;

GRANT EXECUTE ON FUNCTION public.set_language_preference(VARCHAR) TO authenticated;