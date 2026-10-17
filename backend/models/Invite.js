import crypto from 'crypto';
import db from '../config/database.js';

class Invite {
  static async create({ trip_id, email, role, invited_by }) {
    const query = `
      INSERT INTO trip_invites (trip_id, email, role, token, invited_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(query, [trip_id, email, role, crypto.randomBytes(16).toString('hex'), invited_by]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM trip_invites WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findPending(tripId, email) {
    const query = "SELECT * FROM trip_invites WHERE trip_id = $1 AND lower(email) = lower($2) AND status = 'pending'";
    const result = await db.query(query, [tripId, email]);
    return result.rows[0];
  }

  // Pending invites sent to this email address, with enough trip detail for the inbox
  static async findPendingForEmail(email) {
    const query = `
      SELECT i.id, i.role, i.created_at,
        t.id AS trip_id, t.title, t.destination_city, t.destination_country, t.start_date, t.end_date,
        u.first_name AS invited_by_first_name, u.last_name AS invited_by_last_name, u.avatar_color AS invited_by_avatar_color
      FROM trip_invites i
      JOIN trips t ON t.id = i.trip_id
      LEFT JOIN users u ON u.id = i.invited_by
      WHERE lower(i.email) = lower($1) AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `;
    const result = await db.query(query, [email]);
    return result.rows;
  }

  static async findPendingForTrip(tripId) {
    const query = `
      SELECT i.id, i.email, i.role, i.created_at, u.first_name, u.last_name, u.avatar_color
      FROM trip_invites i
      LEFT JOIN users u ON lower(u.email) = lower(i.email)
      WHERE i.trip_id = $1 AND i.status = 'pending'
      ORDER BY i.created_at
    `;
    const result = await db.query(query, [tripId]);
    return result.rows;
  }

  static async setStatus(id, status, client = db) {
    const result = await client.query('UPDATE trip_invites SET status = $2 WHERE id = $1 RETURNING *', [id, status]);
    return result.rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM trip_invites WHERE id = $1', [id]);
  }
}

export default Invite;
