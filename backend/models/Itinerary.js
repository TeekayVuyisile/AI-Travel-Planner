import db from '../config/database.js';

class Itinerary {
  static async create(itineraryData, client = db) {
    const {
      trip_id,
      itinerary_data,
      weather_data,
      hotels_data,
      activities_data,
      budget_analysis
    } = itineraryData;

    const query = `
      INSERT INTO saved_itineraries (trip_id, itinerary_data, weather_data, hotels_data, activities_data, budget_analysis)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await client.query(query, [
      trip_id,
      JSON.stringify(itinerary_data),
      JSON.stringify(weather_data),
      JSON.stringify(hotels_data),
      JSON.stringify(activities_data),
      JSON.stringify(budget_analysis)
    ]);

    return result.rows[0];
  }

  static async findByTripId(tripId) {
    const query = 'SELECT * FROM saved_itineraries WHERE trip_id = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [tripId]);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM saved_itineraries WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findLatest(tripId) {
    const query = 'SELECT * FROM saved_itineraries WHERE trip_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1';
    const result = await db.query(query, [tripId]);
    return result.rows[0];
  }

  // Updates one day's theme in the latest plan metadata after that day is regenerated
  static async setDayTheme(client, tripId, day, theme) {
    const query = `
      UPDATE saved_itineraries
      SET itinerary_data = jsonb_set(itinerary_data, ARRAY['day_themes', $2::text], to_jsonb($3::text), true)
      WHERE id = (SELECT id FROM saved_itineraries WHERE trip_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1)
        AND itinerary_data ? 'day_themes'
    `;
    await client.query(query, [tripId, String(day), theme]);
  }
}

export default Itinerary;