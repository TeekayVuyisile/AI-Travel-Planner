import express from 'express';
import placesService from '../services/placesService.js';

const router = express.Router();

// Destination and place suggestions while the user types
router.get('/autocomplete', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q.length < 2) {
    return res.json([]);
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const near = Number.isFinite(lat) && Number.isFinite(lng) && req.query.lat !== undefined ? { lat, lng } : null;
  const type = req.query.type === 'place' ? 'place' : 'city';

  // Activity searches stay within roughly 110 km of the destination, which still allows day trips
  const radiusDeg = type === 'place' && near ? 1 : null;
  try {
    res.json(await placesService.autocomplete(q, { type, near, radiusDeg }));
  } catch (error) {
    res.status(error.status || 500).json({ error: 'Place search is unavailable right now' });
  }
});

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