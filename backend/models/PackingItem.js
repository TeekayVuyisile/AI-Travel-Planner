import db from '../config/database.js';

class PackingItem {
  // Shared items plus the requesting user's personal items
  static async findForUser(tripId, userId) {
    const query = `
      SELECT * FROM packing_items
      WHERE trip_id = $1 AND (user_id IS NULL OR user_id = $2)
      ORDER BY user_id NULLS FIRST, category, id
    `;
    const result = await db.query(query, [tripId, userId]);
    return result.rows;
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM packing_items WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Swaps out the previous AI suggestions but keeps items people added themselves.
  // Personal suggestions are copied to every member. Runs on the caller's transaction client.
  static async replaceGenerated(client, tripId, memberIds, { shared, personal }) {
    await client.query('DELETE FROM packing_items WHERE trip_id = $1 AND ai_generated = TRUE', [tripId]);

    const rows = [
      ...shared.map(item => [null, item]),
      ...memberIds.flatMap(userId => personal.map(item => [userId, item]))
    ];
    for (const [userId, item] of rows) {
      await client.query(
        `INSERT INTO packing_items (trip_id, user_id, label, category, reason, ai_generated)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [tripId, userId, item.label, item.category, item.reason]
      );
    }
  }

  static async setPacked(id, packed) {
    const result = await db.query('UPDATE packing_items SET packed = $2 WHERE id = $1 RETURNING *', [id, packed]);
    return result.rows[0];
  }
}

export default PackingItem;
