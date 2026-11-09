-- Apply the same attachment limits at Storage, including signed uploads.
-- Existing files and access policies remain unchanged.
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp']
WHERE id = 'parent-attachments';
