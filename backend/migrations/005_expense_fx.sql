-- Exchange rate used when an expense was converted to the trip currency, and who logged it.
-- fx_estimated marks conversions made with fallback rates because the rates API was unavailable.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(16,8) NOT NULL DEFAULT 1;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS fx_estimated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
