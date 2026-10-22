import { describe, expect, it } from 'vitest';
import { api, loginCustomer, setupDatabase } from './helpers.js';

setupDatabase();

describe('auth', () => {
  it('registers a customer and returns a token without the password hash', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'New Lifter', email: 'New@Example.com', password: 'supersecret' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({ email: 'new@example.com', role: 'customer' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('ignores a role sent in the register body', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Sneaky', email: 'sneaky@example.com', password: 'supersecret', role: 'admin' });
    expect(res.body.user.role).toBe('customer');
  });

  it('rejects duplicate emails and weak passwords', async () => {
    const dup = await api()
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'demo@gymfuel.dev', password: 'supersecret' });
    expect(dup.status).toBe(409);

    const weak = await api().post('/api/auth/register').send({ name: 'Weak', email: 'weak@example.com', password: '123' });
    expect(weak.status).toBe(400);
  });

  it('logs in and returns the current user from /me', async () => {
    const token = await loginCustomer();
    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('demo@gymfuel.dev');
  });

  it('rejects wrong passwords and bad tokens', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'demo@gymfuel.dev', password: 'wrong-password' });
    expect(res.status).toBe(401);

    const me = await api().get('/api/auth/me').set('Authorization', 'Bearer not-a-token');
    expect(me.status).toBe(401);
  });
});
