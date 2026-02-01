import axios from 'axios';

class CurrencyService {
  constructor() {
    this.apiKey = process.env.EXCHANGERATE_API_KEY;
    this.baseURL = 'https://api.exchangerate-api.com/v4/latest';
  }

  // async convertCurrency(amount, fromCurrency = 'ZAR', toCurrency = 'USD') {
  //   try {
  //     const response = await axios.get(`${this.baseURL}/${fromCurrency}`);
  //     const rate = response.data.rates[toCurrency];
      
  //     if (!rate) {
  //       throw new Error(`Conversion rate for ${toCurrency} not found`);
  //     }

  //     const convertedAmount = amount * rate;
      
  //     return {
  //       original_amount: amount,
  //       original_currency: fromCurrency,
  //       converted_amount: parseFloat(convertedAmount.toFixed(2)),
  //       target_currency: toCurrency,
  //       exchange_rate: parseFloat(rate.toFixed(4)),
  //       last_updated: new Date().toISOString()
  //     };
  //   } catch (error) {
  //     console.error('Currency API error:', error.response?.data || error.message);
      
  //     // Fallback mock conversion rates
  //     return this.getMockConversion(amount, fromCurrency, toCurrency);
  //   }
  // }

  // async getExchangeRates(baseCurrency = 'ZAR') {
  //   try {
  //     const response = await axios.get(`${this.baseURL}/${baseCurrency}`);
  //     return {
  //       base_currency: baseCurrency,
  //       rates: response.data.rates,
  //       last_updated: new Date().toISOString()
  //     };
  //   } catch (error) {
  //     console.error('Exchange rates API error:', error.response?.data || error.message);
  //     return this.getMockExchangeRates(baseCurrency);
  //   }
  // }
  async convertCurrency(amount, fromCurrency = 'ZAR', toCurrency = 'USD') {
  try {
    console.log(`Converting ${amount} ${fromCurrency} to ${toCurrency}`);
    
    // ExchangeRate-API endpoint for conversion
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`, {
      timeout: 10000
    });
    
    const rate = response.data.rates[toCurrency];
    
    if (!rate) {
      throw new Error(`Conversion rate for ${toCurrency} not found`);
    }

    const convertedAmount = amount * rate;
    
    console.log(`Conversion successful: ${amount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`);
    
    return {
      original_amount: amount,
      original_currency: fromCurrency,
      converted_amount: parseFloat(convertedAmount.toFixed(2)),
      target_currency: toCurrency,
      exchange_rate: parseFloat(rate.toFixed(4)),
      last_updated: new Date().toISOString(),
      source: 'exchangerate-api'
    };
  } catch (error) {
    console.error('Currency API error:', error.response?.data || error.message);
    console.log('Using mock conversion data as fallback');
    
    // Fallback mock conversion rates
    return this.getMockConversion(amount, fromCurrency, toCurrency);
  }
}

async getExchangeRates(baseCurrency = 'ZAR') {
  try {
    console.log(`Fetching exchange rates for base: ${baseCurrency}`);
    
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, {
      timeout: 10000
    });
    
    console.log('Exchange rates API response received');
    
    return {
      base_currency: baseCurrency,
      rates: response.data.rates,
      last_updated: new Date().toISOString(),
      source: 'exchangerate-api'
    };
  } catch (error) {
    console.error('Exchange rates API error:', error.response?.data || error.message);
    console.log('Using mock exchange rates as fallback');
    return this.getMockExchangeRates(baseCurrency);
  }
}

  getMockConversion(amount, fromCurrency, toCurrency) {
    const mockRates = {
      'USD': 0.054,
      'EUR': 0.049,
      'GBP': 0.043,
      'ZAR': 1.000
    };

    const rate = mockRates[toCurrency] || 1;
    const convertedAmount = amount * rate;

    return {
      original_amount: amount,
      original_currency: fromCurrency,
      converted_amount: parseFloat(convertedAmount.toFixed(2)),
      target_currency: toCurrency,
      exchange_rate: parseFloat(rate.toFixed(4)),
      last_updated: new Date().toISOString(),
      note: 'Using mock data - API unavailable'
    };
  }

  getMockExchangeRates(baseCurrency) {
    const rates = {
      'USD': 0.054,
      'EUR': 0.049,
      'GBP': 0.043,
      'JPY': 7.89,
      'AUD': 0.081,
      'CAD': 0.073,
      'ZAR': 1.000
    };

    return {
      base_currency: baseCurrency,
      rates: rates,
      last_updated: new Date().toISOString(),
      note: 'Using mock data - API unavailable'
    };
  }
}

export default new CurrencyService();