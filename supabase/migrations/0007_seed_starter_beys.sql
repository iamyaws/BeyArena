-- supabase/migrations/0007_seed_starter_beys.sql

insert into beys (name_en, name_jp, product_code, type, line, stat_attack, stat_defense, stat_stamina, stat_burst_resistance, source_url, canonical) values
  ('DranSword 3-60F', 'ドランソード 3-60F', 'BX-01', 'attack', 'basic', 8, 4, 5, 5, 'https://beyblade.fandom.com/wiki/DranSword_3-60F', true),
  ('HellsScythe 4-60T', 'ヘルズサイズ 4-60T', 'BX-02', 'balance', 'basic', 6, 6, 7, 5, 'https://beyblade.fandom.com/wiki/HellsScythe_4-60T', true),
  ('WizardArrow 4-80B', 'ウィザードアロー 4-80B', 'BX-03', 'stamina', 'basic', 5, 5, 8, 6, 'https://beyblade.fandom.com/wiki/WizardArrow_4-80B', true),
  ('KnightLance 4-80HN', 'ナイトランス 4-80HN', 'BX-04', 'defense', 'basic', 5, 8, 6, 7, 'https://beyblade.fandom.com/wiki/KnightLance_4-80HN', true);
