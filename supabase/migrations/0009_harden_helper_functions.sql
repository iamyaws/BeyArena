-- 0009_harden_helper_functions.sql
-- Pin search_path on the RLS helper functions to prevent any future
-- search_path-injection attack (a malicious schema placed in front of public
-- in the search_path could shadow our function definitions and bypass RLS).
-- Per Supabase security advisor lint 0011_function_search_path_mutable.
--
-- Also re-applies the app_metadata.role read path from migration 0008 (which
-- was originally hot-patched via direct SQL when the Werkstatt RLS bug came
-- up, never run through `supabase db push` — the migrations table thought
-- 0008 didn't exist). This consolidates both fixes into one migration that
-- the migrations table knows about.

create or replace function public.app_kid_id() returns uuid
  language sql stable
  set search_path = ''
  as $$
    select nullif(
      current_setting('request.jwt.claims', true)::json->>'kid_id',
      ''
    )::uuid
  $$;

create or replace function public.app_is_admin() returns boolean
  language sql stable
  set search_path = ''
  as $$
    select coalesce(
      (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role') = 'admin',
      false
    )
  $$;
