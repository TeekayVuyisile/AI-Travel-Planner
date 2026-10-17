-- Groups, editable itineraries, packing, expenses and chat

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#0d9488';
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_currency VARCHAR(3) DEFAULT 'ZAR';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

ALTER TABLE trips ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZAR';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE trips ALTER COLUMN destination_country DROP NOT NULL;

CREATE TABLE IF NOT EXISTS trip_members (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members(user_id);

-- Every existing trip owner becomes a member
INSERT INTO trip_members (trip_id, user_id, role)
SELECT id, user_id, 'owner' FROM trips WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS trip_invites (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  token VARCHAR(64) NOT NULL UNIQUE,
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trip_invites_email ON trip_invites(email);

CREATE TABLE IF NOT EXISTS itinerary_items (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  slot VARCHAR(20),
  start_time TIME,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  est_cost NUMERIC(10,2) DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_xid VARCHAR(100),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_trip_day ON itinerary_items(trip_id, day, position);

CREATE TABLE IF NOT EXISTS activity_votes (
  item_id INTEGER NOT NULL REFERENCES itinerary_items(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  PRIMARY KEY (item_id, user_id)
);

CREATE TABLE IF NOT EXISTS packing_items (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL = shared item
  label VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  reason TEXT,
  packed BOOLEAN NOT NULL DEFAULT FALSE,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_packing_items_trip_id ON packing_items(trip_id);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL,
  amount_trip NUMERIC(12,2) NOT NULL, -- converted to the trip currency
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  description VARCHAR(255),
  spent_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);

CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share NUMERIC(12,2) NOT NULL, -- in the trip currency
  PRIMARY KEY (expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_trip_id ON chat_messages(trip_id, created_at);
