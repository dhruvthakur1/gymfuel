import { describe, expect, it } from 'vitest';
import { api, loginAdmin, loginCustomer, loginDemoAdmin, setupDatabase } from './helpers.js';

setupDatabase();

const newProduct = {
  name: 'Test Whey',
  slug: 'test-whey',
  brand: 'TestBrand',
  category: 'protein',
  price: 199900,
  stock: 5,
};

describe('product catalogue', () => {
  it('lists products with pagination', async () => {
    const res = await api().get('/api/products?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(5);
    expect(res.body.total).toBe(14);
    expect(res.body.pages).toBe(3);
  });

  it('searches by name, brand or tag', async () => {
    const res = await api().get('/api/products?q=vegan');
    expect(res.body.items.map((p) => p.slug)).toEqual(['plant-protein-blend-1kg']);
  });

  it('filters by category and price range and sorts by price', async () => {
    const res = await api().get('/api/products?category=protein&maxPrice=500000&sort=price_asc');
    const prices = res.body.items.map((p) => p.price);
    expect(res.body.items.every((p) => p.category === 'protein')).toBe(true);
    expect(prices.every((p) => p <= 500000)).toBe(true);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('can hide out-of-stock products', async () => {
    const res = await api().get('/api/products?inStock=true&limit=50');
    expect(res.body.items.some((p) => p.stock === 0)).toBe(false);
  });

  it('rejects invalid query parameters', async () => {
    const res = await api().get('/api/products?category=steroids');
    expect(res.status).toBe(400);
  });

  it('returns a single product by slug, or 404', async () => {
    expect((await api().get('/api/products/gold-standard-whey-2kg')).body.product.brand).toBe('Optimum Nutrition');
    expect((await api().get('/api/products/does-not-exist')).status).toBe(404);
  });
});

describe('product admin', () => {
  it('lets an admin create, update and delete products', async () => {
    const auth = { Authorization: `Bearer ${await loginAdmin()}` };

    const created = await api().post('/api/products').set(auth).send(newProduct);
    expect(created.status).toBe(201);
    const id = created.body.product.id;

    const updated = await api().patch(`/api/products/${id}`).set(auth).send({ price: 149900 });
    expect(updated.body.product.price).toBe(149900);

    expect((await api().delete(`/api/products/${id}`).set(auth)).status).toBe(204);
  });

  it('forbids customers and unauthenticated users', async () => {
    expect((await api().post('/api/products').send(newProduct)).status).toBe(401);

    const token = await loginCustomer();
    const res = await api().post('/api/products').set('Authorization', `Bearer ${token}`).send(newProduct);
    expect(res.status).toBe(403);
  });

  it('keeps the public demo admin read-only', async () => {
    const token = await loginDemoAdmin();
    const res = await api().post('/api/products').set('Authorization', `Bearer ${token}`).send(newProduct);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/read-only/);
  });
});
