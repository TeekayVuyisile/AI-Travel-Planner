import db from '../config/database.js';

class ChatMessage {
  static async create({ trip_id, user_id, role, content }) {
    const query = `
      INSERT INTO chat_messages (trip_id, user_id, role, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(query, [trip_id, user_id, role, content]);
    return result.rows[0];
  }

  // Most recent messages in chronological order, with the author's name for group display
  static async findRecent(tripId, limit = 50) {
    const query = `
      SELECT * FROM (
        SELECT c.*, u.first_name, u.last_name, u.avatar_color
        FROM chat_messages c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.trip_id = $1
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT $2
      ) recent
      ORDER BY created_at, id
    `;
    const result = await db.query(query, [tripId, limit]);
    return result.rows;
  }
}

export default ChatMessage;
