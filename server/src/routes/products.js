import { Router } from 'express';
import { z } from 'zod';
import { CATEGORIES, Product } from '../models/Product.js';
import { blockDemo, requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { notFound } from '../lib/errors.js';

const router = Router();

const SORTS = {
  featured: { featured: -1, rating: -1 },
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { rating: -1, reviewCount: -1 },
};

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(CATEGORIES).optional(),
  brand: z.string().trim().max(60).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  sort: z.enum(Object.keys(SORTS)).default('featured'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', validate(listSchema, 'query'), async (req, res) => {
  const { q, category, brand, minPrice, maxPrice, inStock, sort, page, limit } = req.valid.query;

  const filter = {};
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: re }, { brand: re }, { tags: re }, { description: re }];
  }
  if (category) filter.category = category;
  if (brand) filter.brand = new RegExp(`^${escapeRegex(brand)}$`, 'i');
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (inStock === 'true') filter.stock = { $gt: 0 };

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ ...SORTS[sort], _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/facets', async (_req, res) => {
  const [brands, priceRange] = await Promise.all([
    Product.distinct('brand'),
    Product.aggregate([{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }]),
  ]);
  res.json({
    categories: CATEGORIES,
    brands: brands.sort(),
    price: { min: priceRange[0]?.min ?? 0, max: priceRange[0]?.max ?? 0 },
  });
});

router.get('/:slug', async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) throw notFound('Product not found');
  res.json({ product });
});

// ---- Admin ----

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers and dashes'),
  brand: z.string().trim().min(1).max(60),
  category: z.enum(CATEGORIES),
  description: z.string().max(2000).default(''),
  price: z.number().int().min(0),
  size: z.string().max(40).default(''),
  flavors: z.array(z.string().trim().min(1)).max(20).default([]),
  tags: z.array(z.string().trim().min(1)).max(20).default([]),
  stock: z.number().int().min(0),
  featured: z.boolean().default(false),
});

const admin = [requireAuth, requireRole('admin')];

router.post('/', ...admin, blockDemo, validate(productSchema), async (req, res) => {
  const product = await Product.create(req.valid.body);
  res.status(201).json({ product });
});

router.patch('/:id', ...admin, blockDemo, validate(productSchema.partial()), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.valid.body, { new: true, runValidators: true });
  if (!product) throw notFound('Product not found');
  res.json({ product });
});

router.delete('/:id', ...admin, blockDemo, async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw notFound('Product not found');
  res.status(204).end();
});

export default router;
