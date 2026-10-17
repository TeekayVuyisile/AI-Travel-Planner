import db from '../config/database.js';

const insertItems = async (client, tripId, items, userId) => {
  const positions = {};
  for (const item of items) {
    positions[item.day] = (positions[item.day] ?? -1) + 1;
    await client.query(
      `INSERT INTO itinerary_items (trip_id, day, position, slot, start_time, title, description, category, est_cost, lat, lng, place_xid, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        tripId, item.day, positions[item.day], item.slot, item.start_time, item.title, item.description,
        item.category, item.est_cost, item.lat, item.lng, item.place_xid, userId
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
