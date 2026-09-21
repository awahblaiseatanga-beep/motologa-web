-- Migration to add old and new part photo URLs to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS old_part_photo_url text;

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS new_part_photo_url text;
