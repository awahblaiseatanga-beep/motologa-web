-- ==============================================================================
-- MOTOLOGA PHASE 4: BILINGUAL ARCHITECTURE FOUNDATION (I18N)
-- Timestamp: 2026-09-28
-- Summary: Augments public.profiles and public.garages with read-safe 
--          language preferences avoiding historical string destruction.
-- ==============================================================================

-- 1. ADD USER LANGUAGE PREFERENCE NATIVELY
-- Inherits existing multi-tenant UPDATE mapping (auth.uid() = user_id).
ALTER TABLE public.profiles 
ADD COLUMN language_preference VARCHAR(10) NULL 
CHECK (language_preference IN ('en', 'fr'));

-- 2. ADD GARAGE DEFAULT FALLBACK NATIVELY
-- Bound to "en" statically enforcing perfect backwards-compatibility preventing
-- arbitrary mutations upon existing garages resolving active legacy operations.
ALTER TABLE public.garages 
ADD COLUMN default_language VARCHAR(10) NOT NULL DEFAULT 'en' 
CHECK (default_language IN ('en', 'fr'));

-- Note: RLS explicitly protects these columns implicitly as part of the broader 
-- row restrictions. The UI explicitly handles `NULL` preference states deriving 
-- dynamically from `garage.default_language` directly over Realtime Channels.
