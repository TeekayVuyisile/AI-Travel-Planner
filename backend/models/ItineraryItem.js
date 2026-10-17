import db from '../config/database.js';

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
}

export default ItineraryItem;
