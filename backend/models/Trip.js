import db, { pool } from '../config/database.js';
import TripMember from './TripMember.js';

class Trip {
  static async create(tripData) {
    const {
      user_id,
      title,
      destination_city,
      destination_country,
      start_date,
      end_date,
      total_budget,
      currency,
      travelers_count,
      interests
    } = tripData;

    const query = `
      INSERT INTO trips (user_id, title, destination_city, destination_country, start_date, end_date, total_budget, currency, travelers_count, interests)
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'ZAR'), $9, $10)
      RETURNING *
    `;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(query, [
        user_id,
        title,
        destination_city,
        destination_country,
        start_date,
        end_date,
        total_budget,
        currency,
        travelers_count,
        JSON.stringify(interests)
      ]);
      const trip = result.rows[0];
      await TripMember.add(trip.id, user_id, 'owner', client);
      await client.query('COMMIT');
      return trip;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Trips the user owns or has joined, with their role and the members' avatars
  static async findByUserId(userId) {
    const query = `
      SELECT t.*, m.role,
        (SELECT json_agg(json_build_object('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name, 'avatar_color', u.avatar_color) ORDER BY tm.joined_at)
         FROM trip_members tm JOIN users u ON u.id = tm.user_id
         WHERE tm.trip_id = t.id) AS members,
        (SELECT COUNT(*)::int FROM itinerary_items WHERE trip_id = t.id) AS item_count
      FROM trips t
      JOIN trip_members m ON m.trip_id = t.id AND m.user_id = $1
      ORDER BY t.start_date ASC, t.created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM trips WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM trips WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

export default Trip;
