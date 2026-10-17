-- Whether an activity's coordinates came from a geocoder match or a person picking a place,
-- rather than an AI estimate. Unverified pins are shown as approximate on the map.

ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS location_verified BOOLEAN NOT NULL DEFAULT FALSE;
