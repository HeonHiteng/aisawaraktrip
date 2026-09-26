-- ============================================================
-- 0017 catalogue photo uploads: size + type limits on the bucket
--
-- Admins upload listing photos straight from the browser (see components/admin/photo-field).
-- The browser shrinks them first, but the bucket must not rely on that: it refuses anything
-- over 5 MB or that isn't a JPG / PNG / WebP (no SVG — it can carry script). Only admins can
-- write to this bucket (policies in 0006); anyone can read.
-- ============================================================

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'catalogue';

-- avatars: same guard for what tourists can upload (folder-per-user policies are in 0006)
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';
