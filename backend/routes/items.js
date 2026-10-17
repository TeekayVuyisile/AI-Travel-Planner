import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { pool } from '../config/database.js';
import requireTripRole from '../middleware/tripAccess.js';
import Trip from '../models/Trip.js';
import ItineraryItem from '../models/ItineraryItem.js';
import { CATEGORIES } from '../services/aiService.js';
import { tripDayCount } from '../utils/dates.js';

// Itinerary item editing. Mounted by routes/trips.js after `auth`.
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Shared field rules for create (required title) and update (everything optional)
const itemFields = (isCreate) => [
  isCreate
    ? body('title').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Give the activity a name')
    : body('title').optional().isString().trim().isLength({ min: 1, max: 255 }).withMessage('Give the activity a name'),
  body('description').optional({ values: 'null' }).isString().trim().isLength({ max: 600 }),
  body('start_time').optional({ values: 'null' }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Use a time like 09:30'),
  body('category').optional({ values: 'null' }).isIn(CATEGORIES),
  body('est_cost').optional().isFloat({ min: 0, max: 1_000_000 }).toFloat().withMessage('Cost must be 0 or more'),
  body('lat').optional({ values: 'null' }).isFloat({ min: -90, max: 90 }).toFloat(),
  body('lng').optional({ values: 'null' }).isFloat({ min: -180, max: 180 }).toFloat()
];

// Loads the item and checks it belongs to the trip in the URL
const loadItem = async (req, res, next) => {
  try {
    const item = await ItineraryItem.findById(req.params.itemId);
    if (!item || item.trip_id !== Number(req.params.tripId)) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    req.item = item;
    next();
  } catch (error) {
    next(error);
  }
};

router.get('/:tripId/items', requireTripRole('viewer'), async (req, res) => {
  try {
    res.json(await ItineraryItem.findByTripId(req.params.tripId, req.user.id));
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch itinerary items' });
  }
});

router.post(
  '/:tripId/items',
  requireTripRole('editor'),
  [body('day').isInt({ min: 1 }).toInt(), ...itemFields(true)],
  validate,
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.tripId);
      if (req.body.day > tripDayCount(trip)) {
        return res.status(400).json({ error: 'That day is not part of this trip' });
      }
      const item = await ItineraryItem.create(trip.id, req.body, req.user.id);
      res.status(201).json(item);
    } catch (error) {
      console.error('Create item error:', error);
      res.status(500).json({ error: 'Failed to add the activity' });
    }
  }
);

router.patch(
  '/:tripId/items/:itemId',
  requireTripRole('editor'),
  [param('itemId').isInt(), ...itemFields(false)],
  validate,
  loadItem,
  async (req, res) => {
    try {
      res.json(await ItineraryItem.update(req.item.id, req.body));
    } catch (error) {
      console.error('Update item error:', error);
      res.status(500).json({ error: 'Failed to update the activity' });
    }
  }
);

router.delete('/:tripId/items/:itemId', requireTripRole('editor'), [param('itemId').isInt()], validate, loadItem, async (req, res) => {
  try {
    await ItineraryItem.delete(req.item.id);
    res.json({ message: 'Activity removed' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to remove the activity' });
  }
});

// Saves a drag-and-drop result for one or more days
router.put(
  '/:tripId/items/order',
  requireTripRole('editor'),
  [
    body('days').isArray({ min: 1 }),
    body('days.*.day').isInt({ min: 1 }).toInt(),
    body('days.*.ids').isArray(),
    body('days.*.ids.*').isInt().toInt()
  ],
  validate,
  async (req, res) => {
    const client = await pool.connect();
    try {
      const trip = await Trip.findById(req.params.tripId);
      if (req.body.days.some(d => d.day > tripDayCount(trip))) {
        return res.status(400).json({ error: 'That day is not part of this trip' });
      }

      await client.query('BEGIN');
      const ok = await ItineraryItem.reorder(client, trip.id, req.body.days);
      if (!ok) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'The order includes activities from another trip' });
      }
      await client.query('COMMIT');
      res.json(await ItineraryItem.findByTripId(trip.id, req.user.id));
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Reorder items error:', error);
      res.status(500).json({ error: 'Failed to save the new order' });
    } finally {
      client.release();
    }
  }
);

export default router;
