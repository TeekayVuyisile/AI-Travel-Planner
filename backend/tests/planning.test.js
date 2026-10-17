import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTrip, createUser, pool } from './helpers.js';

// The test setup blanks GROQ_API_KEY, so these cover the paths a visitor sees when the AI is down
after(() => pool.end());

let owner, trip;

before(async () => {
  owner = await createUser('Planner');
  trip = await createTrip(owner);
});

describe('planning without the AI', () => {
  it('falls back to the rule-based planner and still writes items and a packing list', async () => {
    const res = await owner.http.post(`/api/trips/${trip.id}/generate-itinerary`).expect(200);
    assert.equal(res.body.plan.source, 'rules');
    assert.equal(res.body.plan.days.length, 3);

    const items = (await owner.http.get(`/api/trips/${trip.id}/items`).expect(200)).body;
    assert.equal(new Set(items.map(i => i.day)).size, 3);

    const packing = (await owner.http.get(`/api/trips/${trip.id}/packing`).expect(200)).body;
    assert.ok(packing.some(p => p.user_id === null), 'has shared items');
    assert.ok(packing.some(p => p.user_id === owner.user.id), 'has personal items');

    const tripRes = (await owner.http.get(`/api/trips/${trip.id}`).expect(200)).body;
    assert.equal(tripRes.plan.source, 'rules');
  });

  it('never shows mock weather as a forecast', async () => {
    const tripRes = (await owner.http.get(`/api/trips/${trip.id}`).expect(200)).body;
    assert.ok(tripRes.plan.days.every(d => d.weather === null));
  });

  it('explains that replanning a day and the chat need the AI', async () => {
    const replan = await owner.http.post(`/api/trips/${trip.id}/days/1/regenerate`).expect(503);
    assert.match(replan.body.error, /not configured/);

    const chat = await owner.http.get(`/api/trips/${trip.id}/chat`).expect(200);
    assert.equal(chat.body.enabled, false);
    await owner.http.post(`/api/trips/${trip.id}/chat`, { message: 'Hi' }).expect(503);
  });

  it('gives rule-based budget advice', async () => {
    const res = await owner.http.post(`/api/trips/${trip.id}/budget/advice`).expect(200);
    assert.equal(res.body.source, 'rules');
    assert.match(res.body.headline, /9[\s,]?000 ZAR/);
  });

  it('rejects trips longer than 30 days', async () => {
    const res = await owner.http.post('/api/trips', {
      destination_city: 'Lisbon', start_date: '2030-01-01', end_date: '2030-03-01', total_budget: 100, travelers_count: 1
    }).expect(400);
    assert.match(res.body.errors[0].msg, /30 days/);
  });
});
