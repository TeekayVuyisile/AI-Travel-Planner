import express from 'express';
import placesService from '../services/placesService.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { city, interests } = req.query;
    
    if (!city) {
      return res.status(400).json({ error: 'City parameter is required' });
    }

    const interestsArray = interests ? interests.split(',') : [];
    const places = await placesService.searchPlacesByCity(city, interestsArray);
    res.json(places);
  } catch (error) {
    console.error('Places route error:', error);
    res.status(500).json({ error: 'Failed to fetch places data' });
  }
});

export default router;