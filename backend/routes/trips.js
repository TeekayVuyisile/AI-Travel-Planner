import express from 'express';
import { body, validationResult } from 'express-validator';
import auth from '../middleware/auth.js';
import requireTripRole from '../middleware/tripAccess.js';
import TripMember from '../models/TripMember.js';
import Trip from '../models/Trip.js';
import Itinerary from '../models/Itinerary.js';
import planRoutes from './plan.js';
import itemRoutes from './items.js';
import groupRoutes from './group.js';
import expenseRoutes from './expenses.js';
import alertService from '../services/alertService.js';

const router = express.Router();

// All routes require authentication
router.use(auth);
router.use(planRoutes);
router.use(itemRoutes);
router.use(groupRoutes);
router.use(expenseRoutes);

// Validation middleware
const tripValidation = [
  body('destination_city').notEmpty().trim().withMessage('Destination city is required'),
  body('destination_country').optional().trim(),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required')
    .custom((value, { req }) => {
      const days = (new Date(value) - new Date(req.body.start_date)) / 86400000;
      if (days < 0) {
        throw new Error('End date must be after start date');
      }
      if (days > 29) {
        throw new Error('Trips can be at most 30 days long');
      }
      return true;
    }),
  body('total_budget').isFloat({ min: 1 }).withMessage('Total budget must be at least 1'),
  body('travelers_count').isInt({ min: 1 }).withMessage('Number of travelers must be at least 1'),
  body('interests').optional().isArray().withMessage('Interests must be an array'),
  body('currency').optional().isLength({ min: 3, max: 3 }).isAlpha().toUpperCase(),
  body('title').optional().trim().isLength({ max: 255 }),
  body('destination_lat').optional({ values: 'null' }).isFloat({ min: -90, max: 90 }).toFloat(),
  body('destination_lng').optional({ values: 'null' }).isFloat({ min: -180, max: 180 }).toFloat()
];

// Create a new trip
router.post('/', tripValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      destination_city,
      destination_country,
      start_date,
      end_date,
      total_budget,
      travelers_count,
      interests,
      currency,
      title,
      destination_lat,
      destination_lng
    } = req.body;

    // Create trip
    const trip = await Trip.create({
      user_id: req.user.id,
      title,
      destination_city,
      destination_country,
      destination_lat,
      destination_lng,
      start_date,
      end_date,
      total_budget,
      currency,
      travelers_count,
      interests: interests || []
    });

    res.status(201).json({
      message: 'Trip created successfully',
      trip
    });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Get all trips for user
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.findByUserId(req.user.id);
    res.json(trips);
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Weather warnings for the signed-in user's upcoming trips (declared before /:tripId)
router.get('/alerts', async (req, res) => {
  try {
    res.json(await alertService.forUser(req.user.id));
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to check the weather' });
  }
});

// Get one trip with its members
router.get('/:tripId', requireTripRole('viewer'), async (req, res) => {
  try {
    const { tripId } = req.params;
    const [trip, members, latest] = await Promise.all([
      Trip.findById(tripId),
      TripMember.findByTripId(tripId),
      Itinerary.findLatest(tripId)
    ]);
    const plan = latest ? { ...latest.itinerary_data, days: latest.weather_data?.days || [] } : null;
    res.json({ ...trip, role: req.tripRole, members, plan });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

// Get saved itineraries for a trip
router.get('/:tripId/itineraries', requireTripRole('viewer'), async (req, res) => {
  try {
    const { tripId } = req.params;
    const itineraries = await Itinerary.findByTripId(tripId);
    res.json(itineraries);
  } catch (error) {
    console.error('Get itineraries error:', error);
    res.status(500).json({ error: 'Failed to fetch itineraries' });
  }
});

// Delete a trip
router.delete('/:tripId', requireTripRole('owner'), async (req, res) => {
  try {
    await Trip.delete(req.params.tripId);

    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

export default router;