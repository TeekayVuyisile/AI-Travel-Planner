import express from 'express';
import { body, validationResult } from 'express-validator';
import auth from '../middleware/auth.js';
import Trip from '../models/Trip.js';
import Itinerary from '../models/Itinerary.js';
import weatherService from '../services/weatherService.js';
import placesService from '../services/placesService.js';
import hotelService from '../services/hotelService.js';
import itineraryService from '../services/itineraryService.js';
import currencyService from '../services/currencyService.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

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
  body('interests').optional().isArray().withMessage('Interests must be an array')
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
      interests
    } = req.body;

    // Create trip
    const trip = await Trip.create({
      user_id: req.user.id,
      destination_city,
      destination_country,
      start_date,
      end_date,
      total_budget,
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

// Generate itinerary for a trip
router.post('/:tripId/generate-itinerary', async (req, res) => {
  try {
    const { tripId } = req.params;
    
    // Get trip details
    const trip = await Trip.findById(tripId);
    if (!trip || trip.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Fetch all required data
    const [weatherData, places, currencyRates] = await Promise.all([
      weatherService.getWeatherForecast(trip.destination_city, trip.destination_country),
      placesService.searchPlacesByCity(trip.destination_city, trip.interests),
      currencyService.getExchangeRates('ZAR')
    ]);

    // Get hotels
    const hotels = hotelService.getHotelsByCity(
      trip.destination_city, 
      trip.total_budget, 
      trip.travelers_count
    );

    // Generate itinerary
    const itinerary = itineraryService.generateItinerary(
      trip,
      weatherData,
      places,
      hotels
    );

    // Generate packing list
    const packingList = itineraryService.generatePackingList(
      weatherData,
      trip.interests,
      itinerary.daily_itinerary.length
    );

    // Save itinerary
    const savedItinerary = await Itinerary.create({
      trip_id: tripId,
      itinerary_data: itinerary,
      weather_data: weatherData,
      hotels_data: hotels,
      activities_data: places,
      budget_analysis: {
        packing_list: packingList,
        currency_rates: currencyRates,
        budget_summary: itinerary.summary
      }
    });

    res.json({
      message: 'Itinerary generated successfully',
      itinerary: savedItinerary
    });
  } catch (error) {
    console.error('Generate itinerary error:', error);
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
});

// Get saved itineraries for a trip
router.get('/:tripId/itineraries', async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.findById(tripId);
    if (!trip || trip.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const itineraries = await Itinerary.findByTripId(tripId);
    res.json(itineraries);
  } catch (error) {
    console.error('Get itineraries error:', error);
    res.status(500).json({ error: 'Failed to fetch itineraries' });
  }
});

// Delete a trip
router.delete('/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.delete(tripId, req.user.id);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
});

export default router;