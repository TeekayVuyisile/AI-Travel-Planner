// Resets the demo accounts and their sample trips. Safe to re-run: only rows owned by is_demo users are touched.
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

const DEMO_USERS = [
  { email: 'alex@demo.travel', first_name: 'Alex', last_name: 'Mokoena', avatar_color: '#0d9488' },
  { email: 'lerato@demo.travel', first_name: 'Lerato', last_name: 'Dlamini', avatar_color: '#e11d48' },
  { email: 'sam@demo.travel', first_name: 'Sam', last_name: 'Patel', avatar_color: '#7c3aed' },
  { email: 'jordan@demo.travel', first_name: 'Jordan', last_name: 'Smith', avatar_color: '#d97706' }
];

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// day, slot, start_time, title, description, category, est_cost, lat, lng
const CAPE_TOWN_ITEMS = [
  [1, 'morning', '09:00', 'Table Mountain Aerial Cableway', 'Ride up early before the queues and the wind pick up. Walk the summit loop for views over Camps Bay.', 'nature', 420, -33.9486, 18.4031],
  [1, 'afternoon', '13:30', 'Lunch at the V&A Waterfront', 'Food market stalls by the harbour, then browse the Watershed craft market.', 'food', 250, -33.9036, 18.4207],
  [1, 'evening', '18:30', 'Sunset at Signal Hill', 'Short drive up for sunset over the Atlantic. Bring a jacket, it gets windy.', 'nature', 0, -33.9172, 18.3958],
  [2, 'morning', '08:30', 'Cape Point and Cape of Good Hope', 'Full morning in the nature reserve. Take the funicular to the old lighthouse.', 'nature', 380, -34.3568, 18.4970],
  [2, 'afternoon', '13:00', 'Boulders Beach penguins', 'Boardwalk to the African penguin colony in Simon\'s Town.', 'nature', 190, -34.1975, 18.4513],
  [2, 'evening', '19:00', 'Dinner in Kalk Bay', 'Seafood at the harbour, then a walk past the fishing boats.', 'food', 450, -34.1280, 18.4478],
  [3, 'morning', '10:00', 'Bo-Kaap walking tour', 'Colourful streets, Cape Malay history and a cooking demo.', 'history', 300, -33.9206, 18.4148],
  [3, 'afternoon', '14:00', 'Zeitz MOCAA', 'Contemporary African art in the converted grain silo.', 'art', 275, -33.9078, 18.4228],
  [3, 'evening', '20:00', 'Bree Street bars', 'Cocktails and tapas along Bree Street.', 'nightlife', 500, -33.9200, 18.4170],
  [4, 'morning', '09:30', 'Kirstenbosch Botanical Garden', 'Tree canopy walkway and fynbos gardens on the slopes of Table Mountain.', 'nature', 220, -33.9875, 18.4327],
  [4, 'afternoon', '13:30', 'Constantia wine tasting', 'Groot Constantia, the oldest wine estate in the country.', 'food', 350, -34.0270, 18.4243]
];

const PACKING = [
  // label, category, reason, shared
  ['Windproof jacket', 'clothing', 'The south-easter often blows above 40 km/h in the afternoons, especially on Table Mountain and Signal Hill.', false],
  ['SPF 50 sunscreen', 'health', 'UV index is forecast at 9-10 around midday even when it feels cool.', true],
  ['Comfortable walking shoes', 'clothing', 'Day 2 and day 4 involve 6-8 km of walking on uneven paths.', false],
  ['Swimwear', 'clothing', 'Boulders Beach on day 2 has sheltered swimming spots.', false],
  ['Reusable water bottles', 'gear', 'Cape Point has limited places to refill.', false],
  ['Universal plug adapter (Type M)', 'electronics', 'South Africa uses Type M sockets.', true],
  ['First aid kit', 'health', 'Hiking days; a small group kit is enough.', true]
];

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Removing the demo users cascades to their trips, memberships, items and expenses
    await client.query('DELETE FROM users WHERE is_demo = TRUE OR email = ANY($1)', [DEMO_USERS.map(u => u.email)]);

    // Demo users sign in through POST /api/auth/demo, so their password is never used
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    const users = [];
    for (const u of DEMO_USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, avatar_color, is_demo)
         VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id, first_name`,
        [u.email, passwordHash, u.first_name, u.last_name, u.avatar_color]
      );
      users.push(rows[0]);
    }
    const [alex, lerato, sam, jordan] = users;

    // Main group trip, owned by Alex
    const start = addDays(new Date(), 21);
    const { rows: [trip] } = await client.query(
      `INSERT INTO trips (user_id, title, destination_city, destination_country, start_date, end_date, total_budget, currency, travelers_count, interests)
       VALUES ($1, 'Cape Town long weekend', 'Cape Town', 'South Africa', $2, $3, 24000, 'ZAR', 3, $4) RETURNING id`,
      [alex.id, start, addDays(start, 3), JSON.stringify(['nature', 'food', 'history', 'art'])]
    );
    for (const [user, role] of [[alex, 'owner'], [lerato, 'editor'], [sam, 'viewer']]) {
      await client.query('INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, $3)', [trip.id, user.id, role]);
    }
    await client.query(
      `INSERT INTO trip_invites (trip_id, email, role, token, invited_by) VALUES ($1, $2, 'editor', $3, $4)`,
      [trip.id, 'jordan@demo.travel', crypto.randomBytes(16).toString('hex'), alex.id]
    );

    const itemIds = [];
    const positions = {};
    for (const [day, slot, time, title, description, category, cost, lat, lng] of CAPE_TOWN_ITEMS) {
      positions[day] = (positions[day] ?? -1) + 1;
      const { rows } = await client.query(
        `INSERT INTO itinerary_items (trip_id, day, position, slot, start_time, title, description, category, est_cost, lat, lng, created_by, location_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE) RETURNING id`,
        [trip.id, day, positions[day], slot, time, title, description, category, cost, lat, lng, alex.id]
      );
      itemIds.push(rows[0].id);
    }

    // Plan metadata (summary, tips, day themes) like a generated plan, labelled as sample data
    const days = [0, 1, 2, 3].map(i => {
      const date = addDays(start, i);
      return {
        day: i + 1,
        date,
        weekday: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }),
        weather: null
      };
    });
    await client.query(
      `INSERT INTO saved_itineraries (trip_id, itinerary_data, weather_data) VALUES ($1, $2, $3)`,
      [trip.id, JSON.stringify({
        source: 'sample',
        model: null,
        summary: "Four days mixing Cape Town's mountain and coastline with its food, history and art, with the long Cape Point drive on day 2.",
        tips: [
          'Book the cableway online for an early slot; it closes when the wind picks up.',
          "Hire a car for day 2. Cape Point and Simon's Town are hard to reach by public transport.",
          'Tipping 10 to 15 percent is standard in restaurants.'
        ],
        day_themes: { 1: 'Mountain and waterfront', 2: 'Cape Peninsula road trip', 3: 'History and art in the city', 4: 'Gardens and wine' },
        generated_at: new Date().toISOString()
      }), JSON.stringify({ days })]
    );

    // A few votes so the group features have something to show
    const votes = [[0, alex, 1], [0, lerato, 1], [0, sam, 1], [3, lerato, 1], [8, sam, -1], [8, lerato, 1], [10, alex, 1]];
    for (const [index, user, vote] of votes) {
      await client.query('INSERT INTO activity_votes (item_id, user_id, vote) VALUES ($1, $2, $3)', [itemIds[index], user.id, vote]);
    }

    for (const [label, category, reason, shared] of PACKING) {
      if (shared) {
        await client.query(
          'INSERT INTO packing_items (trip_id, user_id, label, category, reason, ai_generated) VALUES ($1, NULL, $2, $3, $4, TRUE)',
          [trip.id, label, category, reason]
        );
      } else {
        for (const user of [alex, lerato, sam]) {
          await client.query(
            'INSERT INTO packing_items (trip_id, user_id, label, category, reason, ai_generated, packed) VALUES ($1, $2, $3, $4, $5, TRUE, $6)',
            [trip.id, user.id, label, category, reason, user === lerato]
          );
        }
      }
    }

    // payer, amount, currency, amount in ZAR, category, description, day offset, split between
    const expenses = [
      [alex, 4800, 'ZAR', 4800, 'accommodation', 'Airbnb deposit', 0, [alex, lerato, sam]],
      [lerato, 1260, 'ZAR', 1260, 'activities', 'Cableway tickets', 0, [alex, lerato, sam]],
      [sam, 45, 'USD', 810, 'food', 'Waterfront lunch', 0, [alex, lerato, sam]],
      [alex, 900, 'ZAR', 900, 'transport', 'Car hire fuel', 1, [alex, lerato, sam]],
      [lerato, 540, 'ZAR', 540, 'food', 'Kalk Bay dinner (Lerato and Sam)', 1, [lerato, sam]]
    ];
    for (const [payer, amount, currency, amountTrip, category, description, offset, splitWith] of expenses) {
      const { rows: [expense] } = await client.query(
        `INSERT INTO expenses (trip_id, paid_by, amount, currency, amount_trip, category, description, spent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [trip.id, payer.id, amount, currency, amountTrip, category, description, addDays(start, offset)]
      );
      const share = Math.round((amountTrip / splitWith.length) * 100) / 100;
      for (const user of splitWith) {
        await client.query('INSERT INTO expense_splits (expense_id, user_id, share) VALUES ($1, $2, $3)', [expense.id, user.id, share]);
      }
    }

    // A second trip owned by Jordan with a pending invite for Alex, so the invite inbox has something in it
    const start2 = addDays(new Date(), 60);
    const { rows: [trip2] } = await client.query(
      `INSERT INTO trips (user_id, title, destination_city, destination_country, start_date, end_date, total_budget, currency, travelers_count, interests)
       VALUES ($1, 'Lisbon food trip', 'Lisbon', 'Portugal', $2, $3, 3000, 'EUR', 2, $4) RETURNING id`,
      [jordan.id, start2, addDays(start2, 4), JSON.stringify(['food', 'history', 'nightlife'])]
    );
    await client.query('INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, $3)', [trip2.id, jordan.id, 'owner']);
    await client.query(
      `INSERT INTO trip_invites (trip_id, email, role, token, invited_by) VALUES ($1, $2, 'editor', $3, $4)`,
      [trip2.id, 'alex@demo.travel', crypto.randomBytes(16).toString('hex'), jordan.id]
    );

    await client.query('COMMIT');
    console.log(`Seeded ${users.length} demo users and 2 trips`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch(error => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
