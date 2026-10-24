import axios from 'axios';

const geocodeCache = new Map();
const autocompleteCache = new Map();
let nominatimNextAt = 0;

class PlacesService {
  constructor() {
    this.apiKey = process.env.OPENTRIPMAP_API_KEY;
    this.baseURL = 'https://api.opentripmap.com/0.1/en';
  }

  async getPlacesByLocation(lat, lon, radius = 5000, kinds = '') {
    try {
      const response = await axios.get(`${this.baseURL}/places/radius`, {
        params: {
          lat,
          lon,
          radius,
          kinds: kinds || 'interesting_places,historic,architecture,cultural,museums,religion,amusement,adult',
          format: 'json',
          apikey: this.apiKey
        }
      });

      // Get details for each place (limited to 10 for performance)
      const placesWithDetails = await Promise.all(
        response.data.slice(0, 10).map(place => this.getPlaceDetails(place.xid))
      );

      return placesWithDetails.filter(place => place !== null);
    } catch (error) {
      console.error('Places API error:', error.response?.data || error.message);
      return this.getMockPlacesData();
    }
  }

  async getPlaceDetails(xid) {
    try {
      const response = await axios.get(`${this.baseURL}/places/xid/${xid}`, {
        params: {
          apikey: this.apiKey
        }
      });

      return this.formatPlaceData(response.data);
    } catch (error) {
      console.error('Place details API error:', error.response?.data || error.message);
      return null;
    }
  }

  // City centre from OpenStreetMap's free Nominatim geocoder (no key; 1 request/second policy, so results are cached)
  // Finds a named place within `radiusDeg` of `near`, for checking AI suggestions. Tries Photon first
  // and falls back to Nominatim when Photon is busy (it returns 503 under load). Nominatim allows
  // occasional lookups like these but no more than one per second, so calls to it are spaced out.
  // `skipPhoton` lets a caller go straight to Nominatim once Photon has failed during a run.
  async searchNearby(query, near, radiusDeg, { skipPhoton = false, onPhotonError } = {}) {
    try {
      if (skipPhoton) throw new Error('Photon skipped');
      return await this.autocomplete(query, { type: 'place', near, radiusDeg, timeout: 3000 });
    } catch (error) {
      if (!skipPhoton) onPhotonError?.(error);
      const wait = nominatimNextAt - Date.now();
      nominatimNextAt = Math.max(Date.now(), nominatimNextAt) + 1100;
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));

      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'jsonv2',
          limit: 5,
          viewbox: [near.lng - radiusDeg, near.lat + radiusDeg, near.lng + radiusDeg, near.lat - radiusDeg].join(','),
          bounded: 1
        },
        headers: { 'User-Agent': 'ai-travel-assistant/1.0 (portfolio project)' },
        timeout: 8000
      });
      return response.data
        .filter(r => r.name)
        .map(r => ({ name: r.name, lat: Number(r.lat), lng: Number(r.lon), kind: r.type }));
    }
  }

  async geocodeCity(city, country = '') {
    const query = [city, country].filter(Boolean).join(', ');
    if (geocodeCache.has(query)) return geocodeCache.get(query);

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: query, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'ai-travel-assistant/1.0 (portfolio project)' },
        timeout: 8000
      });
      const hit = response.data[0];
      const result = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
      geocodeCache.set(query, result);
      return result;
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return null;
    }
  }

  // Search-as-you-type through Photon (komoot's OpenStreetMap geocoder, built for autocomplete).
  // Throws when Photon is unreachable or throttling (it answers 503 when busy), so callers can tell
  // "no matches" apart from "search unavailable".
  // type 'city' returns towns and cities; type 'place' returns any POI, biased towards `near`.
  // `radiusDeg` restricts results to a box around `near` (Photon's location bias alone is weak).
  async autocomplete(query, { type = 'city', near = null, radiusDeg = null, timeout = 6000 } = {}) {
    const key = `${type}|${query.toLowerCase()}|${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ''}|${radiusDeg ?? ''}`;
    if (autocompleteCache.has(key)) return autocompleteCache.get(key);

    const params = new URLSearchParams({ q: query, limit: '6', lang: 'en' });
    // Filtering on place type finds towns like Knysna that Photon's "city" layer misses
    if (type === 'city') ['city', 'town', 'village'].forEach(kind => params.append('osm_tag', `place:${kind}`));
    if (near) {
      params.set('lat', near.lat);
      params.set('lon', near.lng);
      if (radiusDeg) {
        params.set('bbox', [near.lng - radiusDeg, near.lat - radiusDeg, near.lng + radiusDeg, near.lat + radiusDeg].join(','));
      }
    }

    try {
      const response = await axios.get(`https://photon.komoot.io/api/?${params}`, {
        headers: { 'User-Agent': 'ai-travel-assistant/1.0 (portfolio project)' },
        timeout
      });
      const results = response.data.features.map(({ properties: p, geometry }) => ({
        name: p.name,
        // For a town, Photon's `city` is often the surrounding municipality (Knysna -> George)
        city: type === 'city' ? p.name : p.city || null,
        region: p.state || null,
        country: p.country || null,
        country_code: p.countrycode || null,
        kind: p.osm_value || null,
        lat: geometry.coordinates[1],
        lng: geometry.coordinates[0]
      })).filter(r => r.name);

      // Same place can come back once per OSM object (node and relation); keep the first
      const unique = [...new Map(results.map(r => [`${r.name}|${r.region}|${r.country}`, r])).values()];
      if (autocompleteCache.size > 500) autocompleteCache.clear();
      autocompleteCache.set(key, unique);
      return unique;
    } catch (error) {
      console.error('Autocomplete error:', error.message);
      const unavailable = new Error('Place search is unavailable');
      unavailable.status = 503;
      throw unavailable;
    }
  }

  async searchPlacesByCity(cityName, interests = []) {
    try {
      console.log(`Searching places for city: ${cityName}`);
      
      if (!this.apiKey) {
        throw new Error('OpenTripMap API key is missing');
      }

      // 1. Get coordinates for the city
      const geoResponse = await axios.get(`${this.baseURL}/places/geoname`, {
        params: {
          name: cityName,
          apikey: this.apiKey
        }
      });

      if (!geoResponse.data || geoResponse.data.status === 'not_found') {
        console.warn(`City not found: ${cityName}. Falling back to mock data.`);
        return this.getMockPlacesByInterests(cityName, interests);
      }

      const { lat, lon } = geoResponse.data;
      
      // 2. Map interests to OpenTripMap kinds
      const kindsMap = {
        history: 'historic,architecture,museums',
        nature: 'natural,gardens,parks',
        food: 'restaurants,cafes,gastronomy',
        shopping: 'malls,markets',
        adventure: 'amusement,sport',
        nightlife: 'bars,clubs',
        beach: 'beaches',
        art: 'galleries,theatres'
      };

      const selectedKinds = interests.length > 0 
        ? interests.map(i => kindsMap[i]).filter(Boolean).join(',')
        : 'interesting_places';

      // 3. Get places by location
      const places = await this.getPlacesByLocation(lat, lon, 10000, selectedKinds);
      
      if (places.length === 0) {
        return this.getMockPlacesByInterests(cityName, interests);
      }

      return places;
    } catch (error) {
      console.error('Places search error:', error.message);
      return this.getMockPlacesByInterests(cityName, interests);
    }
  }

  formatPlaceData(data) {
    return {
      id: data.xid,
      name: data.name,
      description: data.wikipedia_extracts?.text || data.kinds,
      category: data.kinds?.split(',')[0] || 'attraction',
      rating: data.rate || 'No rating',
      image: data.preview?.source || '',
      location: {
        lat: data.point?.lat,
        lon: data.point?.lon
      },
      address: data.address || 'Address not available',
      wikipedia: data.wikipedia || '',
      source: 'opentripmap'
    };
  }

  getMockPlacesData() {
    return [
      {
        id: '1',
        name: 'City Museum',
        description: 'Explore the rich history and culture of the city',
        category: 'museums',
        rating: '4.5',
        image: '',
        location: { lat: -26.2041, lon: 28.0473 },
        address: '123 Museum Street'
      },
      {
        id: '2',
        name: 'Central Park',
        description: 'Beautiful green space perfect for picnics and walks',
        category: 'parks',
        rating: '4.7',
        image: '',
        location: { lat: -26.2050, lon: 28.0480 },
        address: 'Park Lane'
      }
    ];
  }

  getMockPlacesByInterests(city, interests) {
    const interestMap = {
      'history': [
        {
          id: 'hist1',
          name: `${city} History Museum`,
          description: `Discover the fascinating history of ${city}`,
          category: 'museum',
          rating: '4.6',
          price: '80-150'
        },
        {
          id: 'hist2',
          name: 'Old Town District',
          description: 'Walk through centuries-old streets and architecture',
          category: 'historic',
          rating: '4.8',
          price: 'Free'
        }
      ],
      'nature': [
        {
          id: 'nat1',
          name: `${city} Botanical Gardens`,
          description: 'Stunning collection of local and exotic plants',
          category: 'park',
          rating: '4.7',
          price: '50-100'
        },
        {
          id: 'nat2',
          name: 'Mountain Viewpoint',
          description: 'Breathtaking panoramic views of the city',
          category: 'nature',
          rating: '4.9',
          price: 'Free'
        }
      ],
      'food': [
        {
          id: 'food1',
          name: 'Local Food Market',
          description: 'Taste authentic local cuisine and fresh produce',
          category: 'food',
          rating: '4.5',
          price: '50-200'
        },
        {
          id: 'food2',
          name: 'Cooking Class Experience',
          description: 'Learn to cook traditional dishes',
          category: 'experience',
          rating: '4.8',
          price: '300-500'
        }
      ],
      'shopping': [
        {
          id: 'shop1',
          name: 'Central Mall',
          description: 'Modern shopping center with international brands',
          category: 'shopping',
          rating: '4.3',
          price: 'Varies'
        },
        {
          id: 'shop2',
          name: 'Artisan Market',
          description: 'Handcrafted goods and local souvenirs',
          category: 'shopping',
          rating: '4.6',
          price: '100-500'
        }
      ],
      'adventure': [
        {
          id: 'adv1',
          name: 'Zip Line Adventure',
          description: 'Thrilling zip line over scenic landscapes',
          category: 'adventure',
          rating: '4.7',
          price: '250-400'
        },
        {
          id: 'adv2',
          name: 'Hiking Trails',
          description: 'Guided hiking through beautiful natural reserves',
          category: 'adventure',
          rating: '4.8',
          price: '150-300'
        }
      ]
    };

    let allPlaces = [];
    interests.forEach(interest => {
      if (interestMap[interest]) {
        allPlaces = [...allPlaces, ...interestMap[interest]];
      }
    });

    // Remove duplicates and limit to 8 places
    return [...new Map(allPlaces.map(item => [item.id, item])).values()].slice(0, 8);
  }
}

export default new PlacesService();