-- supabase/migrations/0006_indexes.sql

create index battles_logged_at_idx on battles (logged_at desc);
create index battles_dispute_window_pending_idx
  on battles (dispute_window_ends_at) where status = 'pending';
create index battles_winner_idx on battles (winner_kid_id);
create index battles_loser_idx on battles (loser_kid_id);
create index kid_beys_kid_idx on kid_beys (kid_id);
create index team_members_kid_idx on team_members (kid_id);
create index team_members_team_idx on team_members (team_id);
create index kid_milestones_kid_idx on kid_milestones (kid_id);
create index endorsements_to_idx on endorsements (to_kid_id);
create index notifications_kid_unread_idx on notifications (kid_id) where read_at is null;
