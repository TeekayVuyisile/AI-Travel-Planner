import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addMember, createTrip, createUser, pool } from './helpers.js';

after(() => pool.end());

let alex, lerato, sam, outsider, trip;
const base = { currency: 'ZAR', category: 'food', spent_at: '2030-03-01' };

before(async () => {
  [alex, lerato, sam, outsider] = await Promise.all(['Alex', 'Lerato', 'Sam', 'Outsider'].map(createUser));
  trip = await createTrip(alex);
  await addMember(trip, alex, lerato, 'editor');
  await addMember(trip, alex, sam, 'viewer');
});

const ids = () => [alex.user.id, lerato.user.id, sam.user.id];

describe('expenses', () => {
  it('splits evenly to the cent', async () => {
    const res = await sam.http.post(`/api/trips/${trip.id}/expenses`, {
      ...base, amount: 100, paid_by: sam.user.id, split: { mode: 'even', user_ids: ids() }
    }).expect(201);
    assert.equal(Number(res.body.amount_trip), 100);

    const list = (await alex.http.get(`/api/trips/${trip.id}/expenses`).expect(200)).body;
    const shares = list.find(e => e.id === res.body.id).splits.map(s => s.share).sort();
    assert.deepEqual(shares, [33.33, 33.33, 33.34]);
  });

  it('requires custom shares to add up to the amount', async () => {
    const shares = (a, b) => ({ mode: 'custom', shares: [{ user_id: alex.user.id, amount: a }, { user_id: lerato.user.id, amount: b }] });
    await alex.http.post(`/api/trips/${trip.id}/expenses`, { ...base, amount: 300, paid_by: alex.user.id, split: shares(200, 50) }).expect(400);
    await alex.http.post(`/api/trips/${trip.id}/expenses`, { ...base, amount: 300, paid_by: alex.user.id, split: shares(200, 100) }).expect(201);
  });

  it('only accepts payers and splits from inside the group', async () => {
    await alex.http.post(`/api/trips/${trip.id}/expenses`, { ...base, amount: 10, paid_by: outsider.user.id, split: { mode: 'even', user_ids: [alex.user.id] } }).expect(400);
    await alex.http.post(`/api/trips/${trip.id}/expenses`, { ...base, amount: 10, paid_by: alex.user.id, split: { mode: 'even', user_ids: [outsider.user.id] } }).expect(400);
    await outsider.http.post(`/api/trips/${trip.id}/expenses`, { ...base, amount: 10, paid_by: outsider.user.id, split: { mode: 'even', user_ids: [outsider.user.id] } }).expect(404);
  });

  it('settles up with transfers that clear every balance', async () => {
    const budget = (await lerato.http.get(`/api/trips/${trip.id}/budget`).expect(200)).body;
    // Sam paid 100 (shares 33.34/33.33/33.33); Alex paid 300 (Alex 200, Lerato 100)
    assert.equal(budget.spent, 400);
    assert.equal(budget.remaining, 8600);

    const net = new Map(budget.balances.map(b => [b.id, Math.round(b.net * 100)]));
    assert.equal([...net.values()].reduce((a, b) => a + b, 0), 0);
    for (const t of budget.settlements) {
      net.set(t.from.id, net.get(t.from.id) + Math.round(t.amount * 100));
      net.set(t.to.id, net.get(t.to.id) - Math.round(t.amount * 100));
    }
    assert.ok([...net.values()].every(cents => cents === 0));
  });

  it('lets the payer or the owner delete an expense, but not other members', async () => {
    const expense = (await lerato.http.post(`/api/trips/${trip.id}/expenses`, {
      ...base, amount: 50, paid_by: lerato.user.id, split: { mode: 'even', user_ids: ids() }
    }).expect(201)).body;
    await sam.http.delete(`/api/trips/${trip.id}/expenses/${expense.id}`).expect(403);
    await alex.http.delete(`/api/trips/${trip.id}/expenses/${expense.id}`).expect(200);
  });
});
