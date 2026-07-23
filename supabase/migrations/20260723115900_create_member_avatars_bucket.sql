-- Create the member_avatars public storage bucket.
INSERT INTO
  storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
VALUES
  (
    'member_avatars',
    'member_avatars',
    true,
    1048576, -- 1 MB
    ARRAY['image/jpeg', 'image/jpg']
  )
ON CONFLICT (id) DO NOTHING;
