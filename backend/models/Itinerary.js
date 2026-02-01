import db from '../config/database.js';

class Itinerary {
  static async create(itineraryData) {
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

    const result = await db.query(query, [
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
}

export default Itinerary;