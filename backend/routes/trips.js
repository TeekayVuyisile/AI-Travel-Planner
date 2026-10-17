import express from 'express';
import { body, validationResult } from 'express-validator';
import auth from '../middleware/auth.js';
import requireTripRole from '../middleware/tripAccess.js';
import TripMember from '../models/TripMember.js';
import ItineraryItem from '../models/ItineraryItem.js';
import Trip from '../models/Trip.js';
import Itinerary from '../models/Itinerary.js';
import planRoutes from './plan.js';

const router = express.Router();

// All routes require authentication
router.use(auth);
router.use(planRoutes);

// Validation middleware
const tripValidation = [
  body('destination_city').notEmpty().trim().withMessage('Destination city is required'),
  body('destination_country').optional().trim(),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('total_budget').isFloat({ min: 1 }).withMessage('Total budget must be at least 1'),
  body('travelers_count').isInt({ min: 1 }).withMessage('Number of travelers must be at least 1'),
  body('interests').optional().isArray().withMessage('Interests must be an array'),
  body('currency').optional().isLength({ min: 3, max: 3 }).isAlpha().toUpperCase(),
  body('title').optional().trim().isLength({ max: 255 })
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
      title
    } = req.body;

    // Create trip
    const trip = await Trip.create({
      user_id: req.user.id,
      title,
      destination_city,
      destination_country,
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

// Get the editable itinerary items for a trip
router.get('/:tripId/items', requireTripRole('viewer'), async (req, res) => {
  try {
    res.json(await ItineraryItem.findByTripId(req.params.tripId, req.user.id));
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Failed to fetch itinerary items' });
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