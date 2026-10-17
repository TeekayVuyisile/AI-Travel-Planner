import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addMember, createTrip, createUser, pool } from './helpers.js';

after(() => pool.end());

let owner, editor, viewer, outsider, trip, item;

before(async () => {
  [owner, editor, viewer, outsider] = await Promise.all(['Owner', 'Editor', 'Viewer', 'Outsider'].map(createUser));
  trip = await createTrip(owner);
  await addMember(trip, owner, editor, 'editor');
  await addMember(trip, owner, viewer, 'viewer');
  item = (await owner.http.post(`/api/trips/${trip.id}/items`, { day: 1, title: 'Cableway' }).expect(201)).body;
});

describe('trip access', () => {
  it('hides trips from non-members with a 404 rather than a 403', async () => {
    await outsider.http.get(`/api/trips/${trip.id}`).expect(404);
    await outsider.http.get(`/api/trips/${trip.id}/items`).expect(404);
  });

  it('lists the trip with each member’s role', async () => {
    const res = await viewer.http.get(`/api/trips/${trip.id}`).expect(200);
    assert.equal(res.body.role, 'viewer');
    assert.deepEqual(res.body.members.map(m => m.role).sort(), ['editor', 'owner', 'viewer']);
  });

  it('lets only the owner delete the trip', async () => {
    await editor.http.delete(`/api/trips/${trip.id}`).expect(403);
    await viewer.http.delete(`/api/trips/${trip.id}`).expect(403);
  });
});

describe('itinerary editing', () => {
  it('lets editors change items but not viewers', async () => {
    await editor.http.patch(`/api/trips/${trip.id}/items/${item.id}`, { title: 'Cableway at sunrise' }).expect(200);
    await viewer.http.patch(`/api/trips/${trip.id}/items/${item.id}`, { title: 'Nope' }).expect(403);
    await viewer.http.post(`/api/trips/${trip.id}/items`, { day: 1, title: 'Nope' }).expect(403);
  });

  it('validates days, times and item ownership', async () => {
    await owner.http.post(`/api/trips/${trip.id}/items`, { day: 9, title: 'Too late' }).expect(400);
    await owner.http.patch(`/api/trips/${trip.id}/items/${item.id}`, { start_time: '25:00' }).expect(400);

    const other = await createTrip(outsider);
    const otherItem = (await outsider.http.post(`/api/trips/${other.id}/items`, { day: 1, title: 'Theirs' }).expect(201)).body;
    await owner.http.patch(`/api/trips/${trip.id}/items/${otherItem.id}`, { title: 'Hijack' }).expect(404);
    await owner.http.put(`/api/trips/${trip.id}/items/order`, { days: [{ day: 1, ids: [otherItem.id] }] }).expect(400);
  });

  it('marks a location picked by a person as verified', async () => {
    const res = await editor.http.patch(`/api/trips/${trip.id}/items/${item.id}`, { lat: -33.96, lng: 18.41 }).expect(200);
    assert.equal(res.body.location_verified, true);
  });

  it('moves items between days in one request', async () => {
    const second = (await owner.http.post(`/api/trips/${trip.id}/items`, { day: 1, title: 'Lunch' }).expect(201)).body;
    const res = await editor.http.put(`/api/trips/${trip.id}/items/order`, {
      days: [{ day: 1, ids: [second.id] }, { day: 2, ids: [item.id] }]
    }).expect(200);
    const moved = res.body.find(i => i.id === item.id);
    assert.deepEqual([moved.day, moved.position], [2, 0]);
  });
});

describe('votes', () => {
  it('lets every member vote once per item, and clears with 0', async () => {
    await viewer.http.put(`/api/trips/${trip.id}/items/${item.id}/vote`, { vote: 1 }).expect(200);
    await editor.http.put(`/api/trips/${trip.id}/items/${item.id}/vote`, { vote: -1 }).expect(200);
    let res = await viewer.http.put(`/api/trips/${trip.id}/items/${item.id}/vote`, { vote: 1 }).expect(200);
    assert.equal(res.body.score, 0);

    res = await editor.http.put(`/api/trips/${trip.id}/items/${item.id}/vote`, { vote: 0 }).expect(200);
    assert.equal(res.body.score, 1);
    await outsider.http.put(`/api/trips/${trip.id}/items/${item.id}/vote`, { vote: 1 }).expect(404);
  });
});

describe('invites and roles', () => {
  it('lets editors invite viewers only, and stops duplicate invites', async () => {
    const res = await editor.http.post(`/api/trips/${trip.id}/invites`, { email: 'friend@example.com', role: 'editor' }).expect(201);
    assert.equal(res.body.role, 'viewer');
    await owner.http.post(`/api/trips/${trip.id}/invites`, { email: 'friend@example.com' }).expect(400);
    await owner.http.post(`/api/trips/${trip.id}/invites`, { email: viewer.user.email }).expect(400);
    await viewer.http.post(`/api/trips/${trip.id}/invites`, { email: 'another@example.com' }).expect(403);
  });

  it('only accepts an invite addressed to the signed-in user', async () => {
    const newcomer = await createUser('Newcomer');
    const invite = (await owner.http.post(`/api/trips/${trip.id}/invites`, { email: newcomer.user.email }).expect(201)).body;
    await outsider.http.post(`/api/invites/${invite.id}/accept`).expect(404);
    await newcomer.http.post(`/api/invites/${invite.id}/accept`).expect(200);
    await newcomer.http.post(`/api/invites/${invite.id}/accept`).expect(404);
  });

  it('lets only the owner change roles, and never the owner’s own', async () => {
    await editor.http.patch(`/api/trips/${trip.id}/members/${viewer.user.id}`, { role: 'editor' }).expect(403);
    await owner.http.patch(`/api/trips/${trip.id}/members/${owner.user.id}`, { role: 'viewer' }).expect(400);
    const res = await owner.http.patch(`/api/trips/${trip.id}/members/${viewer.user.id}`, { role: 'editor' }).expect(200);
    assert.equal(res.body.role, 'editor');
    await owner.http.patch(`/api/trips/${trip.id}/members/${viewer.user.id}`, { role: 'viewer' }).expect(200);
  });

  it('lets members leave but not the owner, and only the owner remove others', async () => {
    await editor.http.delete(`/api/trips/${trip.id}/members/${viewer.user.id}`).expect(403);
    await owner.http.delete(`/api/trips/${trip.id}/members/${owner.user.id}`).expect(400);

    const leaver = await createUser('Leaver');
    await addMember(trip, owner, leaver, 'viewer');
    await leaver.http.delete(`/api/trips/${trip.id}/members/${leaver.user.id}`).expect(200);
    await leaver.http.get(`/api/trips/${trip.id}`).expect(404);
  });
});
