-- Migration to add general_job_photo_url to jobs and ensure old parts are nullable
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS general_job_photo_url text;

-- old_part_photo_url and new_part_photo_url don't exist directly on the job table in legacy schema, 
-- but if they do, we explicitly make them nullable here:
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'old_part_photo_url'
    ) THEN
        ALTER TABLE public.jobs ALTER COLUMN old_part_photo_url DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'new_part_photo_url'
    ) THEN
        ALTER TABLE public.jobs ALTER COLUMN new_part_photo_url DROP NOT NULL;
    END IF;
END $$;
