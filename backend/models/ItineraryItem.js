import db from '../config/database.js';

const insertItems = async (client, tripId, items, userId) => {
  const positions = {};
  for (const item of items) {
    positions[item.day] = (positions[item.day] ?? -1) + 1;
    await client.query(
      `INSERT INTO itinerary_items (trip_id, day, position, slot, start_time, title, description, category, est_cost, lat, lng, place_xid, created_by, location_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        tripId, item.day, positions[item.day], item.slot, item.start_time, item.title, item.description,
        item.category, item.est_cost, item.lat, item.lng, item.place_xid, userId,
        Boolean(item.location_verified || item.place_xid)
      ]
    );
  }
};

class ItineraryItem {
  // Items in day/position order, with the vote tally and the requesting user's own vote
  static async findByTripId(tripId, userId) {
    const query = `
      SELECT i.*,
        COALESCE(SUM(v.vote), 0)::int AS score,
        COALESCE(MAX(CASE WHEN v.user_id = $2 THEN v.vote END), 0)::int AS my_vote
      FROM itinerary_items i
      LEFT JOIN activity_votes v ON v.item_id = i.id
      WHERE i.trip_id = $1
      GROUP BY i.id
      ORDER BY i.day, i.position, i.id
    `;
    const result = await db.query(query, [tripId, userId]);
    return result.rows;
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM itinerary_items WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Adds an item at the end of its day
  static async create(tripId, item, userId) {
    const query = `
      INSERT INTO itinerary_items (trip_id, day, position, start_time, title, description, category, est_cost, lat, lng, created_by, location_verified)
      VALUES ($1, $2,
        (SELECT COALESCE(MAX(position) + 1, 0) FROM itinerary_items WHERE trip_id = $1 AND day = $2),
        $3, $4, $5, $6, $7, $8, $9, $10, $8::double precision IS NOT NULL)
      RETURNING *
    `;
    const result = await db.query(query, [
      tripId, item.day, item.start_time ?? null, item.title, item.description ?? null,
      item.category ?? null, item.est_cost ?? 0, item.lat ?? null, item.lng ?? null, userId
    ]);
    return result.rows[0];
  }

  // Updates only the fields present in `changes`. A location set by a person (picked from search) counts as verified.
  static async update(id, changes) {
    if ('lat' in changes) changes = { ...changes, location_verified: changes.lat != null };
    const allowed = ['start_time', 'title', 'description', 'category', 'est_cost', 'lat', 'lng', 'location_verified'];
    const fields = allowed.filter(field => field in changes);
    if (fields.length === 0) return ItineraryItem.findById(id);

    const sets = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
    const query = `UPDATE itinerary_items SET ${sets} WHERE id = $1 RETURNING *`;
    const result = await db.query(query, [id, ...fields.map(field => changes[field])]);
    return result.rows[0];
  }

  static async delete(id) {
    await db.query('DELETE FROM itinerary_items WHERE id = $1', [id]);
  }

  // Applies a drag-and-drop result: `days` is [{ day, ids: [itemId, ...] }] in display order.
  // Returns false if any id does not belong to the trip.
  static async reorder(client, tripId, days) {
    const ids = days.flatMap(d => d.ids);
    const { rows } = await client.query(
      'SELECT COUNT(*)::int AS count FROM itinerary_items WHERE trip_id = $1 AND id = ANY($2::int[])',
      [tripId, ids]
    );
    if (rows[0].count !== new Set(ids).size || ids.length !== new Set(ids).size) return false;

    for (const { day, ids: dayIds } of days) {
      for (const [position, id] of dayIds.entries()) {
        await client.query('UPDATE itinerary_items SET day = $1, position = $2 WHERE id = $3', [day, position, id]);
      }
    }
    return true;
  }

  // Replaces the whole itinerary. Runs on the caller's transaction client.
  static async replaceForTrip(client, tripId, items, userId) {
    await client.query('DELETE FROM itinerary_items WHERE trip_id = $1', [tripId]);
    await insertItems(client, tripId, items, userId);
  }

  // Replaces one day's items. Runs on the caller's transaction client.
  static async replaceDay(client, tripId, day, items, userId) {
    await client.query('DELETE FROM itinerary_items WHERE trip_id = $1 AND day = $2', [tripId, day]);
    await insertItems(client, tripId, items.map(item => ({ ...item, day })), userId);
  }
}

export default ItineraryItem;
