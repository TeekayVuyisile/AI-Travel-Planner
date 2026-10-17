import db from '../config/database.js';

export const ROLE_RANK = { viewer: 1, editor: 2, owner: 3 };

class TripMember {
  static async add(tripId, userId, role = 'editor', client = db) {
    const query = `
      INSERT INTO trip_members (trip_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (trip_id, user_id) DO UPDATE SET role = EXCLUDED.role
      RETURNING *
    `;
    const result = await client.query(query, [tripId, userId, role]);
    return result.rows[0];
  }

  static async findRole(tripId, userId) {
    const query = 'SELECT role FROM trip_members WHERE trip_id = $1 AND user_id = $2';
    const result = await db.query(query, [tripId, userId]);
    return result.rows[0]?.role || null;
  }

  static async findByTripId(tripId) {
    const query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_color, m.role, m.joined_at
      FROM trip_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.trip_id = $1
      ORDER BY m.joined_at
    `;
    const result = await db.query(query, [tripId]);
    return result.rows;
  }

  static async remove(tripId, userId) {
    const query = 'DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2 AND role <> $3 RETURNING *';
    const result = await db.query(query, [tripId, userId, 'owner']);
    return result.rows[0];
  }
}

export default TripMember;
