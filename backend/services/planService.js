import { pool } from '../config/database.js';
import Itinerary from '../models/Itinerary.js';
import ItineraryItem from '../models/ItineraryItem.js';
import PackingItem from '../models/PackingItem.js';
import TripMember from '../models/TripMember.js';
import aiService from './aiService.js';
import itineraryService from './itineraryService.js';
import placesService from './placesService.js';
import weatherService from './weatherService.js';
import { toISODate, tripDayCount } from '../utils/dates.js';

// The AI plans long trips in chunks so each response stays small and fast
const DAYS_PER_AI_CALL = 7;
// Upper bound on checking AI places against OpenStreetMap after generation
const VERIFY_BUDGET_MS = 15000;


// One entry per trip day, with the forecast attached when the date falls inside the forecast window.
// Mock forecasts are never attached: the AI must not quote made-up numbers.
const buildTripDays = (trip, forecast) => {
  const byDate = forecast?.source === 'openweathermap'
    ? new Map(forecast.forecasts.map(f => [f.date, f]))
    : new Map();

  const start = new Date(`${toISODate(trip.start_date)}T00:00:00Z`);

  return Array.from({ length: tripDayCount(trip) }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    const iso = date.toISOString().slice(0, 10);
    return {
      day: i + 1,
      date: iso,
      weekday: date.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }),
      weather: byDate.get(iso) || null
    };
  });
};

const gatherContext = async (trip) => {
  const [members, forecast, places, center] = await Promise.all([
    TripMember.findByTripId(trip.id),
    weatherService.getWeatherForecast(trip.destination_city, trip.destination_country),
    placesService.searchPlacesByCity(trip.destination_city, trip.interests || []),
    trip.destination_lat != null
      ? { lat: trip.destination_lat, lng: trip.destination_lng }
      : placesService.geocodeCity(trip.destination_city, trip.destination_country)
  ]);

  return {
    members,
    days: buildTripDays(trip, forecast),
    // Only real OpenTripMap results go to the AI; mock places have no reliable location
    places: places.filter(p => p.source === 'opentripmap' && p.location?.lat),
    center
  };
};

// Rule-based plan in the same shape as the AI plan, used when Groq is unavailable
const fallbackPlan = (trip, days, places) => {
  const legacy = itineraryService.generateItinerary(
    { ...trip, interests: trip.interests || [] },
    { forecasts: days.map(d => d.weather) },
    places,
    []
  );

  return {
    summary: legacy.summary.recommendation,
    tips: [],
    days: legacy.daily_itinerary.map((dayPlan, index) => ({
      day: days[index].day,
      theme: '',
      items: Object.entries(dayPlan.activities).map(([slot, activity]) => ({
        slot,
        start_time: activity.time.slice(0, 5),
        title: activity.activity,
        description: activity.location !== 'Local attractions' ? `Suggested spot: ${activity.location}` : null,
        category: null,
        est_cost: activity.cost.per_person,
        lat: null,
        lng: null,
        place_xid: null
      }))
    }))
  };
};

const fallbackPacking = (trip, days) => {
  const legacy = itineraryService.generatePackingList(
    { forecasts: days.map(d => d.weather).filter(Boolean) },
    trip.interests || [],
    days.length
  );
  const toItems = (labels, category) => labels.map(label => ({ label, category, reason: null }));

  return {
    shared: toItems(['First aid kit', 'Adapter'], 'health'),
    personal: [
      ...toItems(legacy.essentials, 'documents'),
      ...toItems([...new Set(legacy.clothing)], 'clothing')
    ]
  };
};

// Words that identify a place, for matching an activity title against geocoder results.
// Plurals and centre/center are normalised so "Fine Arts Centre" matches "Fine Art Center".
const STOP_WORDS = new Set(['the', 'at', 'and', 'of', 'in', 'on', 'to', 'a', 'tour', 'visit', 'walk', 'lunch', 'dinner', 'breakfast', 'brunch', 'drinks', 'trip', 'day', 'guided', 'local', 'with', 'sunset', 'morning', 'evening']);
const placeWords = (text) => new Set(
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .map(w => (w === 'centre' ? 'center' : w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w))
);
const similarity = (a, b) => {
  const shared = [...a].filter(w => b.has(w)).length;
  return shared / new Set([...a, ...b]).size;
};

const distanceKm = (a, b) => {
  const rad = (deg) => (deg * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

// AI coordinates are estimates and can be kilometres off. Look each activity up on OpenStreetMap
// near the destination; a clear name match replaces the estimate and marks the pin verified.
// Unmatched items keep the AI estimate, shown on the map as an approximate location.
export const refineCoordinates = async (items, center, cityName) => {
  if (!center) return items;
  // Lookups go to Photon with a Nominatim fallback (placesService.searchNearby). The whole check has
  // a time budget so generation never hangs; anything not checked in time keeps its AI estimate,
  // as does everything once both geocoders fail several times in a row.
  const deadline = Date.now() + VERIFY_BUDGET_MS;
  let consecutiveFailures = 0;
  let photonDown = false;
  const search = async (query) => {
    if (consecutiveFailures >= 3 || Date.now() > deadline) return null;
    try {
      const results = await placesService.searchNearby(query, center, 0.35, {
        skipPhoton: photonDown,
        onPhotonError: () => { photonDown = true; }
      });
      consecutiveFailures = 0;
      return results;
    } catch {
      consecutiveFailures += 1;
      return null;
    }
  };
  // The destination's own name says nothing about which place in it is meant
  const cityWords = placeWords(cityName);
  const distinctive = (text) => new Set([...placeWords(text)].filter(w => !cityWords.has(w)));

  const lookup = async (item) => {
    // "Knysna Waterfront - Art & Craft Market" -> the part naming the place
    const name = item.title.split(/\s[-–—(]\s?|:\s/)[0].trim();
    // "Shopping at Victoria Street Market" -> "Victoria Street Market"
    const afterAt = name.match(/\s(?:at|in)\s+(.+)$/i)?.[1] ?? '';
    const words = name.split(/\s+/);
    // Photon needs every word to match, so also try with trailing words dropped ("Beach Walk" -> "Beach")
    const queries = [...new Set([afterAt, name, words.slice(0, -1).join(' '), words.slice(0, -2).join(' ')])]
      .filter(q => q && distinctive(q).size > 0);

    // Nominatim is rate-limited to one call a second but matches loosely, so after falling back to it
    // each item gets only its best query
    for (const query of photonDown ? queries.slice(0, 1) : queries) {
      const wanted = distinctive(query);
      const results = await search(query);
      if (!results) continue;
      const best = results
        .filter(r => distanceKm(center, r) <= 40)
        .map(r => ({ r, score: similarity(wanted, distinctive(r.name)) }))
        .sort((a, b) => b.score - a.score)[0];
      if (best && best.score >= 0.6) {
        return { ...item, lat: best.r.lat, lng: best.r.lng, location_verified: true };
      }
    }
    return { ...item, location_verified: false };
  };

  // Two at a time, to stay inside the free geocoder's fair-use limits
  const refined = [];
  for (let i = 0; i < items.length; i += 2) {
    refined.push(...await Promise.all(items.slice(i, i + 2).map(lookup)));
  }
  return refined;
};

const withTransaction = async (work) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

class PlanService {
  // Generates (or regenerates) the whole itinerary and the AI packing suggestions for a trip
  async generatePlan(trip, userId) {
    const { members, days, places, center } = await gatherContext(trip);

    let source = 'rules';
    let plan = null;
    if (aiService.isEnabled()) {
      try {
        plan = { summary: '', tips: [], days: [] };
        for (let i = 0; i < days.length; i += DAYS_PER_AI_CALL) {
          const chunk = await aiService.generateItinerary({
            trip,
            days: days.slice(i, i + DAYS_PER_AI_CALL),
            members,
            places,
            center,
            avoidTitles: plan.days.flatMap(d => d.items.map(item => item.title))
          });
          plan.summary ||= chunk.summary;
          plan.tips = plan.tips.length ? plan.tips : chunk.tips;
          plan.days.push(...chunk.days);
        }
        if (plan.days.every(d => d.items.length === 0)) throw new Error('AI returned an empty itinerary');
        source = 'ai';
      } catch (error) {
        console.error('AI itinerary failed, using rule-based planner:', error.message.slice(0, 300));
        plan = null;
      }
    }
    plan ||= fallbackPlan(trip, days, places);

    let packing = null;
    if (source === 'ai') {
      try {
        packing = await aiService.generatePackingList({ trip, days, members, itinerary: plan });
      } catch (error) {
        console.error('AI packing list failed, using rule-based list:', error.message.slice(0, 300));
      }
    }
    packing ||= fallbackPacking(trip, days);

    let items = plan.days.flatMap(d => d.items.map(item => ({ ...item, day: d.day })));
    if (source === 'ai') items = await refineCoordinates(items, center, trip.destination_city);
    const meta = {
      source,
      model: source === 'ai' ? aiService.planModel : null,
      summary: plan.summary,
      tips: plan.tips,
      day_themes: Object.fromEntries(plan.days.map(d => [d.day, d.theme])),
      generated_at: new Date().toISOString()
    };

    await withTransaction(async (client) => {
      await ItineraryItem.replaceForTrip(client, trip.id, items, userId);
      await PackingItem.replaceGenerated(client, trip.id, members.map(m => m.id), packing);
      await Itinerary.create({
        trip_id: trip.id,
        itinerary_data: meta,
        weather_data: { days },
        hotels_data: null,
        activities_data: places,
        budget_analysis: null
      }, client);
    });

    return { ...meta, days };
  }

  // Replans a single day, steering away from activities the group downvoted
  async regenerateDay(trip, dayNumber, userId, request = '') {
    if (!aiService.isEnabled()) {
      const error = new Error('The AI assistant is not configured, so single days cannot be regenerated');
      error.status = 503;
      throw error;
    }

    const { members, days, places, center } = await gatherContext(trip);
    const day = days.find(d => d.day === dayNumber);
    if (!day) {
      const error = new Error('That day is not part of this trip');
      error.status = 404;
      throw error;
    }

    const current = await ItineraryItem.findByTripId(trip.id, userId);
    const otherTitles = current.filter(i => i.day !== dayNumber).map(i => i.title);
    const rejectedTitles = current.filter(i => i.day === dayNumber && i.score < 0).map(i => i.title);

    const result = await aiService.regenerateDay({
      trip, day, members, places, center, otherTitles, rejectedTitles, request
    });
    if (result.items.length === 0) {
      throw new Error('AI returned no activities for the day');
    }

    const items = await refineCoordinates(result.items, center, trip.destination_city);
    await withTransaction(async (client) => {
      await ItineraryItem.replaceDay(client, trip.id, dayNumber, items, userId);
      await Itinerary.setDayTheme(client, trip.id, dayNumber, result.theme);
    });

    return { day: dayNumber, theme: result.theme };
  }

  // Compact plain-text description of the trip for the chat assistant's system prompt
  async buildChatContext(trip, userId) {
    const [members, items, latest, packing] = await Promise.all([
      TripMember.findByTripId(trip.id),
      ItineraryItem.findByTripId(trip.id, userId),
      Itinerary.findLatest(trip.id),
      PackingItem.findForUser(trip.id, userId)
    ]);
    const days = latest?.weather_data?.days || buildTripDays(trip, null);
    const themes = latest?.itinerary_data?.day_themes || {};

    const lines = [
      `${trip.title || `${trip.destination_city} trip`}: ${trip.destination_city}${trip.destination_country ? `, ${trip.destination_country}` : ''}`,
      `Dates: ${days[0].date} to ${days[days.length - 1].date}. Today is ${toISODate(new Date())}.`,
      `Budget: ${trip.total_budget} ${trip.currency} for ${trip.travelers_count} travellers.`,
      `Group: ${members.map(m => `${m.first_name} (${m.role})`).join(', ')}`,
      `Interests: ${(trip.interests || []).join(', ') || 'not specified'}`,
      '',
      'Itinerary:'
    ];
    for (const day of days) {
      const weather = day.weather
        ? ` [forecast: ${day.weather.description}, ${day.weather.min_temp}-${day.weather.max_temp}C, rain ${day.weather.rain_chance}%]`
        : '';
      lines.push(`Day ${day.day} (${day.weekday} ${day.date})${themes[day.day] ? ` - ${themes[day.day]}` : ''}${weather}`);
      for (const item of items.filter(i => i.day === day.day)) {
        lines.push(`  ${item.start_time?.slice(0, 5) || item.slot || ''} ${item.title} (about ${item.est_cost} ${trip.currency} pp, group score ${item.score})`);
      }
    }
    if (packing.length) {
      lines.push('', `Packing list: ${packing.map(p => `${p.label}${p.packed ? ' (packed)' : ''}`).join(', ')}`);
    }
    return lines.join('\n');
  }
}

export default new PlanService();
