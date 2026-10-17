import Trip from '../models/Trip.js';
import Itinerary from '../models/Itinerary.js';
import ItineraryItem from '../models/ItineraryItem.js';
import weatherService from './weatherService.js';
import { toISODate } from '../utils/dates.js';

const OUTDOOR = new Set(['nature', 'beach', 'adventure']);
const RAIN_THRESHOLD = 60;
const WIND_THRESHOLD_KMH = 45;
const FORECAST_DAYS = 5;
const CACHE_MS = 30 * 60 * 1000;

// Forecasts change slowly; cache per city so the dashboard does not call the API on every visit
const forecastCache = new Map();
const getForecast = async (city, country) => {
  const key = `${city}|${country ?? ''}`.toLowerCase();
  const hit = forecastCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.forecast;
  const forecast = await weatherService.getWeatherForecast(city, country);
  forecastCache.set(key, { at: Date.now(), forecast });
  return forecast;
};

const isRough = (weather) => weather && (weather.rain_chance >= RAIN_THRESHOLD || weather.max_wind_kmh >= WIND_THRESHOLD_KMH);

const describe = (weather) => {
  const parts = [];
  if (weather.rain_chance >= RAIN_THRESHOLD) parts.push(`${weather.rain_chance}% chance of rain`);
  if (weather.max_wind_kmh >= WIND_THRESHOLD_KMH) parts.push(`wind up to ${weather.max_wind_kmh} km/h`);
  return parts.join(' and ');
};

class AlertService {
  // Days in the next 5 where rain or strong wind clashes with outdoor plans, for the user's trips
  async forUser(userId) {
    const today = toISODate(new Date());
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + FORECAST_DAYS);
    const horizonISO = toISODate(horizon);

    const trips = (await Trip.findByUserId(userId))
      .filter(t => toISODate(t.end_date) >= today && toISODate(t.start_date) <= horizonISO);

    const alerts = [];
    for (const trip of trips) {
      const forecast = await getForecast(trip.destination_city, trip.destination_country);
      if (forecast?.source !== 'openweathermap') continue; // never alert on mock weather

      const [items, latest] = await Promise.all([
        ItineraryItem.findByTripId(trip.id, userId),
        Itinerary.findLatest(trip.id)
      ]);
      const plannedWeather = new Map((latest?.weather_data?.days ?? []).map(d => [d.date, d.weather]));
      const start = new Date(`${toISODate(trip.start_date)}T00:00:00Z`);

      for (const weather of forecast.forecasts) {
        if (!isRough(weather)) continue;
        const day = Math.round((new Date(`${weather.date}T00:00:00Z`) - start) / 86400000) + 1;
        const outdoor = items.filter(i => i.day === day && OUTDOOR.has(i.category));
        if (outdoor.length === 0) continue;

        alerts.push({
          trip_id: trip.id,
          trip_title: trip.title || `${trip.destination_city} trip`,
          day,
          date: weather.date,
          reason: describe(weather),
          // The plan was made when this day looked fine, so the group may want to replan it
          changed_since_plan: plannedWeather.has(weather.date) && !isRough(plannedWeather.get(weather.date)),
          activities: outdoor.map(i => i.title)
        });
      }
    }
    return alerts;
  }
}

export default new AlertService();
