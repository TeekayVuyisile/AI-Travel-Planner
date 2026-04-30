import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseURL = 'https://api.openweathermap.org/data/2.5';
    
    if (!this.apiKey) {
      console.warn('⚠️  WARNING: OPENWEATHER_API_KEY is missing from environment variables');
    }
  }

  async getWeatherByCity(city, country = '') {
    try {
      const location = country ? `${city},${country}` : city;
      
      console.log(`🌤️  Fetching weather for: ${location}`);
      
      if (!this.apiKey) {
        throw new Error('OpenWeatherMap API key is missing');
      }

      const response = await axios.get(`${this.baseURL}/weather`, {
        params: {
          q: location,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      console.log('✅ Real Weather API response received');
      console.log('   Temperature:', response.data.main.temp + '°C');
      console.log('   Conditions:', response.data.weather[0].description);
      
      return this.formatWeatherData(response.data);
    } catch (error) {
      console.error('❌ Weather API failed:');
      console.error('   Status:', error.response?.status);
      console.error('   Error:', error.response?.data?.message || error.message);
      console.error('   Using mock data as fallback');
      
      return this.getMockWeatherData(city);
    }
  }

  async getWeatherForecast(city, country = '') {
    try {
      const location = country ? `${city},${country}` : city;
      
      console.log(`📅 Fetching forecast for: ${location}`);
      
      if (!this.apiKey) {
        throw new Error('OpenWeatherMap API key is missing');
      }

      const response = await axios.get(`${this.baseURL}/forecast`, {
        params: {
          q: location,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      console.log('✅ Weather forecast API response received');
      return this.formatForecastData(response.data);
    } catch (error) {
      console.error('❌ Weather forecast API error:', error.response?.data || error.message);
      console.log('Using mock forecast data as fallback');
      return this.getMockForecastData(city);
    }
  }

  formatWeatherData(data) {
    return {
      temperature: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      wind_speed: data.wind.speed,
      visibility: data.visibility / 1000, // Convert to km
      sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString(),
      city: data.name,
      country: data.sys.country,
      source: 'openweathermap'
    };
  }

  formatForecastData(data) {
    const dailyForecasts = [];
    
    // Group by date (OpenWeather returns 3-hour intervals)
    const forecastsByDate = {};
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!forecastsByDate[date]) {
        forecastsByDate[date] = [];
      }
      forecastsByDate[date].push(item);
    });

    // Create daily summary
    Object.keys(forecastsByDate).slice(0, 5).forEach(date => {
      const dayForecasts = forecastsByDate[date];
      const temps = dayForecasts.map(f => f.main.temp);
      const weather = dayForecasts[Math.floor(dayForecasts.length / 2)].weather[0];
      
      dailyForecasts.push({
        date,
        min_temp: Math.round(Math.min(...temps)),
        max_temp: Math.round(Math.max(...temps)),
        description: weather.description,
        icon: weather.icon,
        humidity: dayForecasts[0].main.humidity
      });
    });

    return {
      city: data.city.name,
      country: data.city.country,
      forecasts: dailyForecasts,
      source: 'openweathermap'
    };
  }

  getMockWeatherData(city) {
    const weatherConditions = [
      { temp: 25, desc: 'sunny', icon: '01d' },
      { temp: 18, desc: 'cloudy', icon: '03d' },
      { temp: 22, desc: 'partly cloudy', icon: '02d' },
      { temp: 15, desc: 'rainy', icon: '10d' }
    ];
    
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    
    return {
      temperature: randomWeather.temp,
      feels_like: randomWeather.temp - 2,
      humidity: 65,
      pressure: 1013,
      description: randomWeather.desc,
      icon: randomWeather.icon,
      wind_speed: 3.5,
      visibility: 10,
      sunrise: '06:30 AM',
      sunset: '06:45 PM',
      city: city,
      country: 'ZA',
      source: 'mock'
    };
  }

  getMockForecastData(city) {
    const forecasts = [];
    const baseTemp = 20;
    
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecasts.push({
        date: date.toLocaleDateString(),
        min_temp: baseTemp + i - 3,
        max_temp: baseTemp + i + 3,
        description: i % 2 === 0 ? 'sunny' : 'partly cloudy',
        icon: i % 2 === 0 ? '01d' : '02d',
        humidity: 60 + (i * 5)
      });
    }
    
    return {
      city: city,
      country: 'ZA',
      forecasts: forecasts,
      source: 'mock'
    };
  }
}

export default new WeatherService();