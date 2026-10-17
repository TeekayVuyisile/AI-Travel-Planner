import db from '../config/database.js';

class Expense {
  // Expenses newest first, each with its splits and the payer's name
  static async findByTripId(tripId) {
    const query = `
      SELECT e.*,
        u.first_name AS paid_by_first_name, u.last_name AS paid_by_last_name, u.avatar_color AS paid_by_avatar_color,
        COALESCE(
          (SELECT json_agg(json_build_object('user_id', s.user_id, 'share', s.share::float) ORDER BY s.user_id)
           FROM expense_splits s WHERE s.expense_id = e.id),
          '[]'
        ) AS splits
      FROM expenses e
      LEFT JOIN users u ON u.id = e.paid_by
      WHERE e.trip_id = $1
      ORDER BY e.spent_at DESC, e.id DESC
    `;
    const result = await db.query(query, [tripId]);
    return result.rows;
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM expenses WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Inserts the expense and its splits. Runs on the caller's transaction client.
  static async create(client, expense, splits) {
    const { rows: [created] } = await client.query(
      `INSERT INTO expenses (trip_id, paid_by, amount, currency, amount_trip, fx_rate, fx_estimated, category, description, spent_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        expense.trip_id, expense.paid_by, expense.amount, expense.currency, expense.amount_trip,
        expense.fx_rate, expense.fx_estimated, expense.category, expense.description, expense.spent_at, expense.created_by
      ]
    );
    for (const split of splits) {
      await client.query(
        'INSERT INTO expense_splits (expense_id, user_id, share) VALUES ($1, $2, $3)',
        [created.id, split.user_id, split.share]
      );
    }
    return created;
  }

  static async delete(id) {
    await db.query('DELETE FROM expenses WHERE id = $1', [id]);
  }
}

export default Expense;
