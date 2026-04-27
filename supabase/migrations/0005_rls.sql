-- supabase/migrations/0005_rls.sql

-- Helper: extract kid_id from JWT claims
create or replace function public.app_kid_id() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'kid_id', '')::uuid $$;

create or replace function public.app_is_admin() returns boolean
  language sql stable
  as $$ select coalesce((current_setting('request.jwt.claims', true)::json->>'role') = 'admin', false) $$;

-- Enable RLS on all tables
alter table kids enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table push_subscriptions enable row level security;
alter table beys enable row level security;
alter table bey_parts enable row level security;
alter table kid_beys enable row level security;
alter table battles enable row level security;
alter table battle_rounds enable row level security;
alter table disputes enable row level security;
alter table notifications enable row level security;
alter table milestones enable row level security;
alter table kid_milestones enable row level security;
alter table stickers enable row level security;
alter table endorsements enable row level security;

-- KIDS: everyone reads everyone (public profiles); kid writes own profile basics; admin all
create policy kids_read on kids for select using (true);
create policy kids_update_self on kids for update
  using (id = public.app_kid_id())
  with check (id = public.app_kid_id());
create policy kids_admin_all on kids for all
  using (public.app_is_admin())
  with check (public.app_is_admin());

-- TEAMS: read all; create by any kid; update by creator
create policy teams_read on teams for select using (true);
create policy teams_insert on teams for insert with check (created_by_kid_id = public.app_kid_id() or public.app_is_admin());
create policy teams_update on teams for update
  using (created_by_kid_id = public.app_kid_id() or public.app_is_admin())
  with check (created_by_kid_id = public.app_kid_id() or public.app_is_admin());

-- TEAM_MEMBERS: read all; insert/delete by self
create policy team_members_read on team_members for select using (true);
create policy team_members_insert on team_members for insert with check (kid_id = public.app_kid_id() or public.app_is_admin());
create policy team_members_delete on team_members for delete using (kid_id = public.app_kid_id() or public.app_is_admin());

-- PUSH_SUBSCRIPTIONS: own only
create policy push_subs_self on push_subscriptions for all
  using (kid_id = public.app_kid_id() or public.app_is_admin())
  with check (kid_id = public.app_kid_id() or public.app_is_admin());

-- BEYS / BEY_PARTS: read all; admin writes
create policy beys_read on beys for select using (true);
create policy beys_admin on beys for all using (public.app_is_admin()) with check (public.app_is_admin());
create policy bey_parts_read on bey_parts for select using (true);
create policy bey_parts_admin on bey_parts for all using (public.app_is_admin()) with check (public.app_is_admin());

-- KID_BEYS: read all; write own
create policy kid_beys_read on kid_beys for select using (true);
create policy kid_beys_write on kid_beys for all
  using (kid_id = public.app_kid_id() or public.app_is_admin())
  with check (kid_id = public.app_kid_id() or public.app_is_admin());

-- BATTLES: read all; insert by logger=self; update by Edge Functions only (service role)
create policy battles_read on battles for select using (true);
create policy battles_insert on battles for insert
  with check (logger_kid_id = public.app_kid_id() and (winner_kid_id = public.app_kid_id() or loser_kid_id = public.app_kid_id()));
-- update + delete reserved for service role + admin only (no kid policy = denied)
create policy battles_admin_all on battles for all using (public.app_is_admin()) with check (public.app_is_admin());

-- BATTLE_ROUNDS: read all; insert by logger of parent battle
create policy battle_rounds_read on battle_rounds for select using (true);
create policy battle_rounds_insert on battle_rounds for insert
  with check (exists(select 1 from battles where id = battle_id and logger_kid_id = public.app_kid_id()));

-- DISPUTES: read all; insert by self
create policy disputes_read on disputes for select using (true);
create policy disputes_insert on disputes for insert
  with check (disputer_kid_id = public.app_kid_id());

-- NOTIFICATIONS: read/update own
create policy notifs_read on notifications for select using (kid_id = public.app_kid_id() or public.app_is_admin());
create policy notifs_update on notifications for update
  using (kid_id = public.app_kid_id())
  with check (kid_id = public.app_kid_id());

-- MILESTONES / KID_MILESTONES / STICKERS: read all; admin writes catalog; service role grants kid_milestones
create policy milestones_read on milestones for select using (true);
create policy milestones_admin on milestones for all using (public.app_is_admin()) with check (public.app_is_admin());
create policy kid_milestones_read on kid_milestones for select using (true);
create policy stickers_read on stickers for select using (true);
create policy stickers_admin on stickers for all using (public.app_is_admin()) with check (public.app_is_admin());

-- ENDORSEMENTS: read all; insert by from_kid_id = self
create policy endorsements_read on endorsements for select using (true);
create policy endorsements_insert on endorsements for insert with check (from_kid_id = public.app_kid_id());
