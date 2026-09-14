-- ════════════════════════════════════════════════════════════════════════
--  0025 — instructions per OTT platform
--
--  Client (round 4): "Put an 'Create Groups' Option in the Admin Home Page,
--  so i will select the OTT and Add Plans, Validities, and Instructions."
--
--  Selecting the OTT and adding Plans already exists — Admin -> Entertainment.
--  Adding Validities already exists — Admin -> Validity. Neither had anywhere
--  to write Instructions, which is the one genuinely missing piece: guidance
--  for the seller on THIS platform specifically (e.g. "share the password,
--  not your email — changing it locks the buyer out").
-- ════════════════════════════════════════════════════════════════════════

alter table ott_apps add column if not exists instructions text;
