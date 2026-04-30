import axios from 'axios';

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

  async searchPlacesByCity(cityName, interests = []) {
    try {
      console.log(`🔍 Searching places for city: ${cityName}`);
      
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
      wikipedia: data.wikipedia || ''
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