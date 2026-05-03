-- 0010_kids_primary_bey_id.sql
-- Adds an optional "main bey" pointer on kids. Used by the Battle Lab to let
-- crew kids fight against the primary bey of another crew kid. Nullable so
-- existing rows + new kids without a pick remain valid.

ALTER TABLE kids
  ADD COLUMN primary_bey_id uuid REFERENCES beys(id) ON DELETE SET NULL;

COMMENT ON COLUMN kids.primary_bey_id IS
  'Optional. Kid sets in profile/Beys tab. Used as opponent in Battle Lab.';
