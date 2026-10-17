import Groq from 'groq-sdk';

export const CATEGORIES = ['history', 'nature', 'food', 'shopping', 'adventure', 'nightlife', 'beach', 'art', 'transport', 'rest'];
const SLOTS = ['morning', 'midday', 'afternoon', 'evening'];
const PACKING_CATEGORIES = ['clothing', 'gear', 'health', 'electronics', 'documents', 'toiletries'];

// Activities further than this from the city centre are treated as wrong coordinates (day trips stay inside it)
const MAX_DISTANCE_KM = 120;

const distanceKm = (a, b) => {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

// Strict JSON schemas: Groq constrains decoding to these, so responses always parse.
// Strict mode needs every property listed in `required`; optional values are nullable instead.
const object = (properties) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties
});
const nullable = (type) => ({ type: [type, 'null'] });

const ITINERARY_SCHEMA = object({
  summary: { type: 'string' },
  tips: { type: 'array', items: { type: 'string' } },
  days: {
    type: 'array',
    items: object({
      day: { type: 'integer' },
      theme: { type: 'string' },
      items: {
        type: 'array',
        items: object({
          slot: { type: 'string', enum: SLOTS },
          start_time: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          est_cost: { type: 'number' },
          place_xid: nullable('string'),
          lat: nullable('number'),
          lng: nullable('number')
        })
      }
    })
  }
});

const PACKING_ITEM = object({
  label: { type: 'string' },
  category: { type: 'string', enum: PACKING_CATEGORIES },
  reason: { type: 'string' }
});
const PACKING_SCHEMA = object({
  shared: { type: 'array', items: PACKING_ITEM },
  personal: { type: 'array', items: PACKING_ITEM }
});

const clean = (value, max = 255) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const describeWeather = ({ day, date, weekday, weather }) => {
  const prefix = `Day ${day} (${weekday} ${date})`;
  if (!weather) return `${prefix}: no forecast yet, assume typical conditions for this month`;
  return `${prefix}: ${weather.description}, ${weather.min_temp}-${weather.max_temp}C, ` +
    `rain chance ${weather.rain_chance}%, wind up to ${weather.max_wind_kmh} km/h`;
};

const describeTrip = (trip, days, members) => {
  const budget = Number(trip.total_budget);
  const perPersonPerDay = Math.round(budget / trip.travelers_count / days.length);
  return [
    `Destination: ${trip.destination_city}${trip.destination_country ? `, ${trip.destination_country}` : ''}`,
    `Dates: ${days[0].date} to ${days[days.length - 1].date} (${days.length} days)`,
    `Travellers: ${trip.travelers_count}${members.length > 1 ? ` (group: ${members.map(m => m.first_name).join(', ')})` : ''}`,
    `Total budget: ${budget} ${trip.currency} (about ${perPersonPerDay} ${trip.currency} per person per day, including food and accommodation)`,
    `Interests: ${(trip.interests || []).join(', ') || 'general sightseeing'}`
  ].join('\n');
};

class AIService {
  constructor() {
    this.planModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    this.chatModel = process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-20b';
    this.groq = null;
  }

  isEnabled() {
    return Boolean(process.env.GROQ_API_KEY);
  }

  get client() {
    if (!this.groq) {
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 60000, maxRetries: 1 });
    }
    return this.groq;
  }

  async completeJSON(system, user, name, schema, attempt = 1) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.planModel,
        reasoning_effort: 'low',
        temperature: 0.6,
        response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      });
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      // One retry for occasional generation failures; auth, quota and network errors surface immediately
      if (attempt < 2 && (error.status === 400 || error instanceof SyntaxError)) {
        return this.completeJSON(system, user, name, schema, attempt + 1);
      }
      throw error;
    }
  }

  // Normalises model output into rows for itinerary_items. Coordinates are kept only when they are
  // plausibly in the destination; candidate places from OpenTripMap override the model's coordinates.
  sanitizeItems(rawItems, { center, places = [] }) {
    const placesById = new Map(places.map(p => [p.id, p]));

    return (Array.isArray(rawItems) ? rawItems : [])
      .filter(item => clean(item?.title))
      .slice(0, 6)
      .map(item => {
        const place = placesById.get(item.place_xid);
        let lat = place?.location?.lat ?? Number(item.lat);
        let lng = place?.location?.lon ?? Number(item.lng);
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
        if (!hasCoords || (center && distanceKm(center, { lat, lng }) > MAX_DISTANCE_KM)) {
          lat = null;
          lng = null;
        }

        return {
          slot: SLOTS.includes(item.slot) ? item.slot : null,
          start_time: /^([01]\d|2[0-3]):[0-5]\d$/.test(item.start_time) ? item.start_time : null,
          title: clean(item.title),
          description: clean(item.description, 600) || null,
          category: CATEGORIES.includes(item.category) ? item.category : null,
          est_cost: Math.max(0, Math.round(Number(item.est_cost) || 0)),
          lat,
          lng,
          place_xid: place ? place.id : null
        };
      });
  }

  async generateItinerary({ trip, days, members, places, center, avoidTitles = [], notes = [] }) {
    const system = `You are an expert local travel planner. Reply in JSON.
Fields:
- summary: two sentences describing the overall plan.
- tips: 3 to 5 short, practical, destination-specific tips.
- days[].theme: short theme for the day, at most 6 words.
- items[].start_time: "HH:MM", 24 hour.
- items[].title: the name of a real, specific place or experience.
- items[].description: one or two sentences on what to do and why it fits this day; mention the weather when it shaped the choice.
- items[].est_cost: realistic cost per person in the trip currency, 0 if free.
- items[].place_xid: the id from the candidate list when you use one, otherwise null.
Rules:
- 3 or 4 items per day, in time order. Keep the first and last day lighter for arrival and departure.
- Use real places that exist. Give coordinates to 4 decimal places only when you are confident; otherwise null.
- Use the weather: on days with a rain chance of 50% or more, or wind above 40 km/h, put indoor or sheltered activities in the exposed time slots.
- Never invent forecast numbers for days without a forecast.
- Group nearby places on the same day to limit travel time. Never repeat a place across days.
- Keep activity costs well inside the per-person daily budget, leaving room for accommodation.
- Favour the travellers' interests, but include at least one local food experience per day.`;

    const placeList = places.length
      ? `Candidate places (prefer these when they fit, and set place_xid):\n${places.map(p => `- ${p.id}: ${p.name} (${p.category})`).join('\n')}`
      : 'No candidate places supplied; choose well-known real places yourself.';

    const user = [
      describeTrip(trip, days, members),
      `Weather by day:\n${days.map(describeWeather).join('\n')}`,
      placeList,
      avoidTitles.length ? `Already planned on other days, do not repeat: ${avoidTitles.join('; ')}` : '',
      ...notes,
      `Plan days ${days[0].day} to ${days[days.length - 1].day}.`
    ].filter(Boolean).join('\n\n');

    const result = await this.completeJSON(system, user, 'itinerary', ITINERARY_SCHEMA);
    const validDays = new Set(days.map(d => d.day));

    return {
      summary: clean(result.summary, 600),
      tips: (Array.isArray(result.tips) ? result.tips : []).map(t => clean(t, 300)).filter(Boolean).slice(0, 5),
      days: (Array.isArray(result.days) ? result.days : [])
        .filter(d => validDays.has(Number(d?.day)))
        .map(d => ({
          day: Number(d.day),
          theme: clean(d.theme, 80),
          items: this.sanitizeItems(d.items, { center, places })
        }))
    };
  }

  async regenerateDay({ trip, day, members, places, center, otherTitles, rejectedTitles, request }) {
    const notes = [];
    if (rejectedTitles.length) notes.push(`The group voted against these, replace them with something different: ${rejectedTitles.join('; ')}`);
    if (request) notes.push(`Request from the group for this day: "${request}"`);

    const result = await this.generateItinerary({
      trip,
      days: [day],
      members,
      places,
      center,
      avoidTitles: otherTitles,
      notes
    });
    return result.days[0] || { day: day.day, theme: '', items: [] };
  }

  async generatePackingList({ trip, days, members, itinerary }) {
    const system = `You write packing lists that explain themselves. Reply in JSON.
Rules:
- "shared" is 3 to 6 items one person can carry for the whole group (first aid kit, plug adapter, etc.). "personal" is 8 to 14 items each traveller needs.
- Every reason must point to something specific: a day's weather, a planned activity, a local fact (plug type, dress codes, altitude, sun strength). One sentence, no more than 25 words.
- Only quote temperatures, rain chances or wind speeds that appear in the weather list. For days without a forecast, refer to typical conditions for the month.
- Skip things nobody forgets (underwear, phone, wallet, toothbrush) unless there is a destination-specific reason.`;

    const plan = itinerary.days
      .map(d => `Day ${d.day}: ${d.items.map(i => i.title).join(', ')}`)
      .join('\n');

    const user = [
      describeTrip(trip, days, members),
      `Weather by day:\n${days.map(describeWeather).join('\n')}`,
      `Planned activities:\n${plan}`
    ].join('\n\n');

    const result = await this.completeJSON(system, user, 'packing_list', PACKING_SCHEMA);
    const normalise = (list, max) => (Array.isArray(list) ? list : [])
      .filter(item => clean(item?.label))
      .slice(0, max)
      .map(item => ({
        label: clean(item.label, 120),
        category: PACKING_CATEGORIES.includes(item.category) ? item.category : 'gear',
        reason: clean(item.reason, 300) || null
      }));

    return { shared: normalise(result.shared, 8), personal: normalise(result.personal, 16) };
  }

  // Streams the assistant's reply. Yields text chunks; honours the abort signal when the client disconnects.
  async *streamChat({ context, history, signal }) {
    const stream = await this.client.chat.completions.create({
      model: this.chatModel,
      reasoning_effort: 'low',
      temperature: 0.7,
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are the trip assistant inside a group travel planning app. Answer questions about this trip: activities, timing, weather, packing, budget, local customs and getting around.
Be concise and concrete: short paragraphs or bullet lists, under 180 words unless asked for more. Use plain text with simple markdown: bold and bullet lists only, no tables or headings. Do not use emojis.
Several group members share this chat; their names appear before their messages. If you do not know something specific (opening hours, live prices), say so and suggest how to check.

Trip details:
${context}`
        },
        ...history
      ]
    }, { signal });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  }
}

export default new AIService();
