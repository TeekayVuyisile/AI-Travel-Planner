import express from 'express';
import weatherService from '../services/weatherService.js';

const router = express.Router();

router.get('/current', async (req, res) => {
  try {
    const { city, country } = req.query;
    
    if (!city) {
      return res.status(400).json({ error: 'City parameter is required' });
    }

    const weather = await weatherService.getWeatherByCity(city, country);
    res.json(weather);
  } catch (error) {
    console.error('Weather route error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

router.get('/forecast', async (req, res) => {
  try {
    const { city, country } = req.query;
    
    if (!city) {
      return res.status(400).json({ error: 'City parameter is required' });
    }

    const forecast = await weatherService.getWeatherForecast(city, country);
    res.json(forecast);
  } catch (error) {
    console.error('Forecast route error:', error);
    res.status(500).json({ error: 'Failed to fetch forecast data' });
  }
});

export default router;