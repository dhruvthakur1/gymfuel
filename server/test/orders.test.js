import { afterEach, describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { config } from '../src/config.js';
import {
  address,
  api,
  loginAdmin,
  loginCustomer,
  loginDemoAdmin,
  orderById,
  productBySlug,
  setupDatabase,
} from './helpers.js';

setupDatabase();

async function checkout(token, items) {
  return api().post('/api/orders/checkout').set('Authorization', `Bearer ${token}`).send({ items, shippingAddress: address });
}

describe('checkout (mock payments)', () => {
  it('creates a pending order priced from the database, not the client', async () => {
    const token = await loginCustomer();
    const whey = await productBySlug('gold-standard-whey-2kg');

    const res = await checkout(token, [{ productId: whey.id, quantity: 2, flavor: 'Vanilla Ice Cream', price: 1 }]);

    expect(res.status).toBe(201);
    expect(res.body.provider).toBe('mock');
    expect(res.body.url).toContain(`/checkout/mock?order=${res.body.orderId}`);

    const order = await orderById(res.body.orderId);
    expect(order.status).toBe('pending');
    expect(order.subtotal).toBe(whey.price * 2);
    expect(order.shipping).toBe(0); // over the free-shipping threshold
    expect(order.total).toBe(whey.price * 2);
  });

  it('charges shipping on small orders', async () => {
    const token = await loginCustomer();
    const fishOil = await productBySlug('omega-3-fish-oil');
    const res = await checkout(token, [{ productId: fishOil.id, quantity: 1 }]);
    const order = await orderById(res.body.orderId);
    expect(order.shipping).toBe(9900);
    expect(order.total).toBe(fishOil.price + 9900);
  });

  it('rejects out-of-stock items, too many units and unknown flavours', async () => {
    const token = await loginCustomer();
    const outOfStock = await productBySlug('creapure-creatine-200g');
    const lowStock = await productBySlug('pre-workout-ultra'); // 4 left
    const whey = await productBySlug('gold-standard-whey-2kg');

    expect((await checkout(token, [{ productId: outOfStock.id, quantity: 1 }])).body.error).toMatch(/out of stock/);
    expect((await checkout(token, [{ productId: lowStock.id, quantity: 5 }])).body.error).toMatch(/Only 4/);
    // Stock is checked per product even when split across flavours.
    const split = await checkout(token, [
      { productId: lowStock.id, quantity: 3, flavor: 'Green Apple' },
      { productId: lowStock.id, quantity: 2, flavor: 'Cola Kick' },
    ]);
    expect(split.status).toBe(400);
    expect((await checkout(token, [{ productId: whey.id, quantity: 1, flavor: 'Pickle' }])).status).toBe(400);
  });

  it('validates the shipping address', async () => {
    const token = await loginCustomer();
    const whey = await productBySlug('gold-standard-whey-2kg');
    const res = await api()
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: whey.id, quantity: 1 }], shippingAddress: { ...address, postalCode: '12' } });
    expect(res.status).toBe(400);
    expect(res.body.details[0].path).toBe('shippingAddress.postalCode');
  });

  it('marks the order paid and decrements stock exactly once', async () => {
    const token = await loginCustomer();
    const auth = { Authorization: `Bearer ${token}` };
    const creatine = await productBySlug('creatine-monohydrate-250g');
    const { body } = await checkout(token, [{ productId: creatine.id, quantity: 3 }]);

    const paid = await api().post(`/api/orders/${body.orderId}/mock-pay`).set(auth);
    expect(paid.status).toBe(200);
    expect(paid.body.order.status).toBe('paid');
    expect((await productBySlug('creatine-monohydrate-250g')).stock).toBe(creatine.stock - 3);

    const again = await api().post(`/api/orders/${body.orderId}/mock-pay`).set(auth);
    expect(again.status).toBe(400);
    expect((await productBySlug('creatine-monohydrate-250g')).stock).toBe(creatine.stock - 3);

    const mine = await api().get('/api/orders/mine').set(auth);
    expect(mine.body.orders).toHaveLength(1);
  });

  it("hides other customers' orders", async () => {
    const customerToken = await loginCustomer();
    const whey = await productBySlug('gold-standard-whey-2kg');
    const { body } = await checkout(customerToken, [{ productId: whey.id, quantity: 1 }]);

    const other = await api().post('/api/auth/register').send({ name: 'Other', email: 'other@example.com', password: 'supersecret' });
    const res = await api().get(`/api/orders/${body.orderId}`).set('Authorization', `Bearer ${other.body.token}`);
    expect(res.status).toBe(404);
  });
});

describe('order admin', () => {
  it('lists all orders with revenue stats and enforces status transitions', async () => {
    const customer = await loginCustomer();
    const whey = await productBySlug('gold-standard-whey-2kg');
    const { body } = await checkout(customer, [{ productId: whey.id, quantity: 1 }]);
    await api().post(`/api/orders/${body.orderId}/mock-pay`).set('Authorization', `Bearer ${customer}`);

    const admin = { Authorization: `Bearer ${await loginAdmin()}` };
    const list = await api().get('/api/orders').set(admin);
    expect(list.body.stats).toEqual({ revenue: whey.price, paidOrders: 1 });
    expect(list.body.orders[0].user.email).toBe('demo@gymfuel.dev');

    const back = await api().patch(`/api/orders/${body.orderId}/status`).set(admin).send({ status: 'pending' });
    expect(back.status).toBe(400);
    const shipped = await api().patch(`/api/orders/${body.orderId}/status`).set(admin).send({ status: 'shipped' });
    expect(shipped.body.order.status).toBe('shipped');

    const demo = { Authorization: `Bearer ${await loginDemoAdmin()}` };
    expect((await api().get('/api/orders').set(demo)).status).toBe(200);
    expect((await api().patch(`/api/orders/${body.orderId}/status`).set(demo).send({ status: 'delivered' })).status).toBe(403);
  });
});

describe('stripe webhook', () => {
  const webhookSecret = 'whsec_test_secret';

  afterEach(() => {
    config.stripeSecretKey = '';
    config.stripeWebhookSecret = '';
  });

  function signedEvent(payload) {
    const body = JSON.stringify(payload);
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: webhookSecret });
    return { body, signature };
  }

  it('marks the order paid on checkout.session.completed and rejects bad signatures', async () => {
    const token = await loginCustomer();
    const whey = await productBySlug('gold-standard-whey-2kg');
    const { body: created } = await checkout(token, [{ productId: whey.id, quantity: 1 }]);

    // Enable Stripe only for the webhook; no network calls are made to verify signatures.
    config.stripeSecretKey = 'sk_test_dummy';
    config.stripeWebhookSecret = webhookSecret;

    const event = {
      id: 'evt_test',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test', payment_status: 'paid', payment_intent: 'pi_test', metadata: { orderId: created.orderId } } },
    };

    const bad = await api()
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=forged')
      .send(JSON.stringify(event));
    expect(bad.status).toBe(400);
    expect((await orderById(created.orderId)).status).toBe('pending');

    const { body, signature } = signedEvent(event);
    for (let i = 0; i < 2; i++) {
      // Delivered twice to prove the handler is idempotent.
      const res = await api()
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(body);
      expect(res.status).toBe(200);
    }

    const order = await orderById(created.orderId);
    expect(order.status).toBe('paid');
    expect(order.payment.paymentIntentId).toBe('pi_test');
    expect((await productBySlug('gold-standard-whey-2kg')).stock).toBe(whey.stock - 1);
  });
});
