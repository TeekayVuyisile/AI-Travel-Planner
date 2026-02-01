import db from '../config/database.js';

class Trip {
  static async create(tripData) {
    const {
      user_id,
      destination_city,
      destination_country,
      start_date,
      end_date,
      total_budget,
      travelers_count,
      interests
    } = tripData;

    const query = `
      INSERT INTO trips (user_id, destination_city, destination_country, start_date, end_date, total_budget, travelers_count, interests)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(query, [
      user_id,
      destination_city,
      destination_country,
      start_date,
      end_date,
      total_budget,
      travelers_count,
      JSON.stringify(interests)
    ]);

    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM trips WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM trips WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async delete(id, userId) {
    const query = 'DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await db.query(query, [id, userId]);
    return result.rows[0];
  }
}

export default Trip;