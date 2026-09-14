-- ════════════════════════════════════════════════════════════════════════
--  CHECK STORAGE BUCKETS
--
--  supabase/README.md says these 5 buckets must exist, all private. They
--  were always meant to be created by hand in Dashboard → Storage — no
--  migration creates them, so nothing has ever confirmed they exist.
--
--  Read-only.
-- ════════════════════════════════════════════════════════════════════════

with expected(name) as (values
  ('payment-proofs'), ('group-proofs'), ('avatars'),
  ('chat-images'), ('support-videos')
)
select
  e.name as bucket,
  case when b.id is null then 'MISSING — uploads to this bucket will fail'
       when b.public then 'EXISTS but PUBLIC — should be private'
       else 'exists, private' end as status
from expected e
left join storage.buckets b on b.id = e.name
order by e.name;

-- Policies on storage.objects, so we can see whether an existing bucket
-- actually allows an authenticated user to upload into it.
select policyname, cmd, roles
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
 order by policyname;
