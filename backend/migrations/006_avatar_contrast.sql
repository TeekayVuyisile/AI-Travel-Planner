-- Avatar colours carry white initials, so they need 4.5:1 contrast with white.
-- Teal-600 (3.7:1) and amber-600 (3.2:1) move to their 700 steps (5.5:1 and 5.0:1).

ALTER TABLE users ALTER COLUMN avatar_color SET DEFAULT '#0f766e';
UPDATE users SET avatar_color = '#0f766e' WHERE avatar_color = '#0d9488';
UPDATE users SET avatar_color = '#b45309' WHERE avatar_color = '#d97706';
