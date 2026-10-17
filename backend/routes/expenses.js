import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import requireTripRole from '../middleware/tripAccess.js';
import { planLimit } from '../middleware/aiRateLimit.js';
import Trip from '../models/Trip.js';
import TripMember from '../models/TripMember.js';
import Expense from '../models/Expense.js';
import aiService from '../services/aiService.js';
import budgetService, { EXPENSE_CATEGORIES } from '../services/budgetService.js';
import { evenShares } from '../services/settlementService.js';

// Shared expenses and the budget overview. Mounted by routes/trips.js after `auth`.
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.get('/:tripId/expenses', requireTripRole('viewer'), async (req, res) => {
  try {
    res.json(await Expense.findByTripId(req.params.tripId));
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Any member can log a cost they paid for the group.
// split: { mode: 'even', user_ids: [...] } or { mode: 'custom', shares: [{ user_id, amount }] } in the expense currency
router.post(
  '/:tripId/expenses',
  requireTripRole('viewer'),
  [
    body('amount').isFloat({ gt: 0, max: 10_000_000 }).toFloat().withMessage('Enter an amount above 0'),
    body('currency').isString().isLength({ min: 3, max: 3 }).isAlpha().toUpperCase(),
    body('paid_by').isInt().toInt(),
    body('category').isIn(EXPENSE_CATEGORIES),
    body('description').optional({ values: 'falsy' }).isString().trim().isLength({ max: 255 }),
    body('spent_at').isISO8601().withMessage('Pick the date it was paid'),
    body('split.mode').isIn(['even', 'custom']),
    body('split.user_ids').optional().isArray({ min: 1 }),
    body('split.user_ids.*').optional().isInt().toInt(),
    body('split.shares').optional().isArray({ min: 1 }),
    body('split.shares.*.user_id').optional().isInt().toInt(),
    body('split.shares.*.amount').optional().isFloat({ min: 0 }).toFloat()
  ],
  validate,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const trip = await Trip.findById(req.params.tripId);
      const memberIds = new Set((await TripMember.findByTripId(trip.id)).map(m => m.id));
      const { amount, currency, paid_by, category, description, spent_at, split } = req.body;

      if (!memberIds.has(paid_by)) {
        return res.status(400).json({ error: 'The payer must be in the group' });
      }

      const { rate, estimated } = await budgetService.exchangeRate(currency, trip.currency);
      const totalCents = Math.round(amount * rate * 100);

      // Shares are stored in the trip currency and always add up exactly to the converted total
      let shares;
      if (split.mode === 'even') {
        const userIds = [...new Set(split.user_ids ?? [])];
        if (userIds.length === 0 || userIds.some(id => !memberIds.has(id))) {
          return res.status(400).json({ error: 'Split it between people in the group' });
        }
        shares = evenShares(totalCents, userIds);
      } else {
        const custom = (split.shares ?? []).filter(s => s.amount > 0);
        if (custom.length === 0 || custom.some(s => !memberIds.has(s.user_id)) || new Set(custom.map(s => s.user_id)).size !== custom.length) {
          return res.status(400).json({ error: 'Each share must belong to a different person in the group' });
        }
        const customTotal = custom.reduce((sum, s) => sum + Math.round(s.amount * 100), 0);
        if (customTotal !== Math.round(amount * 100)) {
          return res.status(400).json({ error: 'The shares must add up to the total amount' });
        }
        shares = custom.map(s => ({ user_id: s.user_id, cents: Math.round(s.amount * rate * 100) }));
        // Rounding after conversion can leave a cent or two over or under; give it to the first share
        shares[0].cents += totalCents - shares.reduce((sum, s) => sum + s.cents, 0);
      }

      await client.query('BEGIN');
      const expense = await Expense.create(client, {
        trip_id: trip.id,
        paid_by,
        amount,
        currency,
        amount_trip: totalCents / 100,
        fx_rate: rate,
        fx_estimated: estimated,
        category,
        description: description || null,
        spent_at,
        created_by: req.user.id
      }, shares.map(s => ({ user_id: s.user_id, share: s.cents / 100 })));
      await client.query('COMMIT');
      res.status(201).json(expense);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Create expense error:', error);
      res.status(500).json({ error: 'Failed to save the expense' });
    } finally {
      client.release();
    }
  }
);

// The payer, whoever logged it, or the organiser can delete an expense
router.delete('/:tripId/expenses/:expenseId', requireTripRole('viewer'), [param('expenseId').isInt()], validate, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);
    if (!expense || expense.trip_id !== Number(req.params.tripId)) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    const allowed = req.tripRole === 'owner' || expense.paid_by === req.user.id || expense.created_by === req.user.id;
    if (!allowed) {
      return res.status(403).json({ error: 'Only the payer or the organiser can delete this expense' });
    }
    await Expense.delete(expense.id);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete the expense' });
  }
});

router.get('/:tripId/budget', requireTripRole('viewer'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    res.json(await budgetService.summary(trip));
  } catch (error) {
    console.error('Budget summary error:', error);
    res.status(500).json({ error: 'Failed to load the budget' });
  }
});

router.post('/:tripId/budget/advice', requireTripRole('viewer'), planLimit, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    const summary = await budgetService.summary(trip);
    if (aiService.isEnabled()) {
      try {
        return res.json({ source: 'ai', ...(await aiService.budgetAdvice({ trip, summary })) });
      } catch (error) {
        console.error('AI budget advice failed, using rules:', error.message.slice(0, 300));
      }
    }
    res.json({ source: 'rules', ...budgetService.fallbackAdvice(summary) });
  } catch (error) {
    console.error('Budget advice error:', error);
    res.status(500).json({ error: 'Failed to get budget advice' });
  }
});

export default router;
