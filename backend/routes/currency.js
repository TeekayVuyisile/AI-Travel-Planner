import express from 'express';
import currencyService from '../services/currencyService.js';

const router = express.Router();

router.get('/convert', async (req, res) => {
  try {
    const { amount, from = 'ZAR', to = 'USD' } = req.query;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount parameter is required' });
    }

    const conversion = await currencyService.convertCurrency(parseFloat(amount), from, to);
    res.json(conversion);
  } catch (error) {
    console.error('Currency route error:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

router.get('/rates', async (req, res) => {
  try {
    const { base = 'ZAR' } = req.query;
    const rates = await currencyService.getExchangeRates(base);
    res.json(rates);
  } catch (error) {
    console.error('Rates route error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

export default router;