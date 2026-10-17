import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, createUser, pool } from './helpers.js';

after(() => pool.end());

describe('auth', () => {
  it('registers, logs in and returns the current user without the password hash', async () => {
    const { user, token } = await createUser('Ada');
    assert.equal(user.first_name, 'Ada');
    assert.equal(user.password_hash, undefined);

    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: 'password123' }).expect(200);
    assert.ok(login.body.token);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(me.body.user.id, user.id);
  });

  it('rejects a wrong password and a duplicate email', async () => {
    const { user } = await createUser('Bea');
    await request(app).post('/api/auth/login').send({ email: user.email, password: 'nope' }).expect(401);
    await request(app)
      .post('/api/auth/register')
      .send({ email: user.email, password: 'password123', first_name: 'Bea', last_name: 'Two' })
      .expect(400);
  });

  it('rejects requests without a valid token', async () => {
    await request(app).get('/api/trips').expect(401);
    await request(app).get('/api/trips').set('Authorization', 'Bearer not-a-token').expect(401);
  });

  it('reports demo mode as unavailable until the seed has run', async () => {
    const res = await request(app).post('/api/auth/demo').send({}).expect(503);
    assert.match(res.body.error, /npm run seed/);
  });
});
