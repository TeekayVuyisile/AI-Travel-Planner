import express from 'express';
import { body, param, validationResult } from 'express-validator';
import requireTripRole from '../middleware/tripAccess.js';
import { chatLimit, planLimit } from '../middleware/aiRateLimit.js';
import { ROLE_RANK } from '../models/TripMember.js';
import Trip from '../models/Trip.js';
import PackingItem from '../models/PackingItem.js';
import ChatMessage from '../models/ChatMessage.js';
import aiService from '../services/aiService.js';
import planService from '../services/planService.js';

// AI planning, packing list and trip assistant routes. Mounted by routes/trips.js after `auth`.
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Generate (or regenerate) the itinerary and packing suggestions
router.post('/:tripId/generate-itinerary', requireTripRole('editor'), planLimit, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    const plan = await planService.generatePlan(trip, req.user.id);
    res.json({ message: 'Itinerary generated', plan });
  } catch (error) {
    console.error('Generate itinerary error:', error);
    res.status(500).json({ error: 'Failed to generate the itinerary' });
  }
});

// Replan a single day, optionally with a request such as "more relaxed" or "indoors"
router.post(
  '/:tripId/days/:day/regenerate',
  requireTripRole('editor'),
  [
    param('day').isInt({ min: 1 }).toInt(),
    body('request').optional().isString().trim().isLength({ max: 300 })
  ],
  validate,
  planLimit,
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.tripId);
      const result = await planService.regenerateDay(trip, req.params.day, req.user.id, req.body.request);
      res.json({ message: `Day ${result.day} regenerated`, ...result });
    } catch (error) {
      console.error('Regenerate day error:', error);
      res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to regenerate the day' });
    }
  }
);

// Shared items plus the caller's own items
router.get('/:tripId/packing', requireTripRole('viewer'), async (req, res) => {
  try {
    res.json(await PackingItem.findForUser(req.params.tripId, req.user.id));
  } catch (error) {
    console.error('Get packing error:', error);
    res.status(500).json({ error: 'Failed to fetch the packing list' });
  }
});

// Tick an item off. Anyone can tick their own items; shared items need editor rights.
router.patch(
  '/:tripId/packing/:itemId',
  requireTripRole('viewer'),
  [param('itemId').isInt().toInt(), body('packed').isBoolean().toBoolean()],
  validate,
  async (req, res) => {
    try {
      const item = await PackingItem.findById(req.params.itemId);
      if (!item || item.trip_id !== Number(req.params.tripId)) {
        return res.status(404).json({ error: 'Packing item not found' });
      }
      const isOwn = item.user_id === req.user.id;
      const isShared = item.user_id === null;
      if (!isOwn && !(isShared && ROLE_RANK[req.tripRole] >= ROLE_RANK.editor)) {
        return res.status(403).json({ error: 'You cannot change this item' });
      }
      res.json(await PackingItem.setPacked(item.id, req.body.packed));
    } catch (error) {
      console.error('Update packing error:', error);
      res.status(500).json({ error: 'Failed to update the packing item' });
    }
  }
);

router.get('/:tripId/chat', requireTripRole('viewer'), async (req, res) => {
  try {
    res.json({
      enabled: aiService.isEnabled(),
      messages: await ChatMessage.findRecent(req.params.tripId)
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to fetch the conversation' });
  }
});

// Ask the trip assistant. Streams the reply as server-sent events:
// { type: 'user', message } then { type: 'delta', text }... then { type: 'done', message } or { type: 'error', error }
router.post(
  '/:tripId/chat',
  requireTripRole('viewer'),
  [body('message').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Write a message of up to 1000 characters')],
  validate,
  chatLimit,
  async (req, res) => {
    if (!aiService.isEnabled()) {
      return res.status(503).json({ error: 'The trip assistant is not configured on this server' });
    }

    const tripId = Number(req.params.tripId);
    const abort = new AbortController();
    res.on('close', () => abort.abort());

    let started = false;
    const send = (event) => {
      if (!started) {
        res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
        res.flushHeaders();
        started = true;
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      res.flush?.(); // compression middleware buffers otherwise
    };

    try {
      const trip = await Trip.findById(tripId);
      const [context, previous] = await Promise.all([
        planService.buildChatContext(trip, req.user.id),
        ChatMessage.findRecent(tripId, 20)
      ]);
      const userMessage = await ChatMessage.create({
        trip_id: tripId, user_id: req.user.id, role: 'user', content: req.body.message
      });
      send({
        type: 'user',
        message: { ...userMessage, first_name: req.user.first_name, last_name: req.user.last_name, avatar_color: req.user.avatar_color }
      });

      const history = [...previous, { ...userMessage, first_name: req.user.first_name }].map(m => ({
        role: m.role,
        content: m.role === 'user' ? `${m.first_name || 'Someone'}: ${m.content}` : m.content
      }));

      let reply = '';
      for await (const text of aiService.streamChat({ context, history, signal: abort.signal })) {
        reply += text;
        send({ type: 'delta', text });
      }

      const assistantMessage = await ChatMessage.create({
        trip_id: tripId, user_id: null, role: 'assistant', content: reply.trim() || 'Sorry, I could not come up with an answer.'
      });
      send({ type: 'done', message: assistantMessage });
      res.end();
    } catch (error) {
      if (abort.signal.aborted) return;
      console.error('Chat error:', error.message);
      if (started) {
        send({ type: 'error', error: 'The assistant stopped responding. Try again.' });
        res.end();
      } else {
        res.status(500).json({ error: 'The assistant is unavailable right now' });
      }
    }
  }
);

export default router;
