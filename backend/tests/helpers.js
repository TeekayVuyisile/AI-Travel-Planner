import request from 'supertest';
import app from '../app.js';
import { pool } from '../config/database.js';

let counter = 0;

// Registers a fresh user and returns { user, token, http }, where `http` sends authenticated requests
export const createUser = async (firstName = 'Test') => {
  counter += 1;
  const email = `${firstName.toLowerCase()}${counter}.${Date.now()}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', first_name: firstName, last_name: 'User' })
    .expect(201);
  return { user: res.body.user, token: res.body.token, http: client(res.body.token) };
};

export const client = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url, body = {}) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body),
  put: (url, body = {}) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body),
  patch: (url, body = {}) => request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
});

// Trip with coordinates, so planning never needs the geocoder
export const createTrip = async (owner, overrides = {}) => {
  const res = await owner.http.post('/api/trips', {
    destination_city: 'Cape Town',
    destination_country: 'South Africa',
    destination_lat: -33.9249,
    destination_lng: 18.4241,
    start_date: '2030-03-01',
    end_date: '2030-03-03',
    total_budget: 9000,
    currency: 'ZAR',
    travelers_count: 3,
    interests: ['nature', 'food'],
    ...overrides
  }).expect(201);
  return res.body.trip;
};

// Adds `member` to the trip through the real invite flow
export const addMember = async (trip, owner, member, role = 'editor') => {
  await owner.http.post(`/api/trips/${trip.id}/invites`, { email: member.user.email, role }).expect(201);
  const inbox = await member.http.get('/api/invites').expect(200);
  const invite = inbox.body.find(i => i.trip_id === trip.id);
  await member.http.post(`/api/invites/${invite.id}/accept`).expect(200);
};

export { app, pool };
