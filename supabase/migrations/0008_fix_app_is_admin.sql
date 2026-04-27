-- 0008_fix_app_is_admin.sql
-- Fix: app_is_admin() was reading the JWT's top-level `role` claim, but Supabase
-- Auth always sets that to "authenticated". The admin marker we set via
-- `update auth.users set raw_app_meta_data = jsonb_set(..., '{role}', '"admin"')`
-- lives at `app_metadata.role` in the JWT — not the top-level claim.

create or replace function public.app_is_admin() returns boolean
  language sql stable
  as $$
    select coalesce(
      (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role') = 'admin',
      false
    )
  $$;
