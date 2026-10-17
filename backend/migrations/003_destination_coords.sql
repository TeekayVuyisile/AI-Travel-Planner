-- Coordinates of the destination picked from autocomplete; used as the map centre and AI distance check

ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION;
