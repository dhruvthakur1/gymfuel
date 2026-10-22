import { Router } from 'express';
import { z } from 'zod';
import { ORDER_STATUSES, Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { blockDemo, requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import {
  computeTotals,
  createCheckoutSession,
  markOrderPaid,
  paymentMode,
  syncOrderWithStripe,
} from '../lib/payments.js';
import { config } from '../config.js';

const router = Router();
router.use(requireAuth);

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid product id'),
        quantity: z.number().int().min(1).max(20),
        flavor: z.string().trim().max(60).optional(),
      })
    )
    .min(1, 'Your cart is empty')
    .max(30),
  shippingAddress: z.object({
    fullName: z.string().trim().min(2).max(80),
    line1: z.string().trim().min(3).max(200),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  }),
});

router.post('/checkout', validate(checkoutSchema), async (req, res) => {
  const { items, shippingAddress } = req.valid.body;

  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Prices always come from the database, never from the client.
  const orderItems = items.map(({ productId, quantity, flavor }) => {
    const product = byId.get(productId);
    if (!product) throw badRequest('One of the products in your cart no longer exists');
    if (flavor && !product.flavors.includes(flavor)) throw badRequest(`${product.name} is not available in ${flavor}`);
    return { product: product._id, name: product.name, price: product.price, quantity, flavor: flavor || '' };
  });

  // The same product can appear more than once (different flavours), so check stock per product.
  const requested = new Map();
  for (const item of orderItems) {
    const key = item.product.toString();
    requested.set(key, (requested.get(key) || 0) + item.quantity);
  }
  for (const [id, qty] of requested) {
    const product = byId.get(id);
    if (product.stock < qty) {
      throw badRequest(
        product.stock === 0 ? `${product.name} is out of stock` : `Only ${product.stock} of ${product.name} left in stock`
      );
    }
  }

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    ...computeTotals(orderItems),
    currency: config.currency,
    shippingAddress,
    payment: { provider: paymentMode() },
  });

  const session = await createCheckoutSession(order, req.user.email);
  if (session.sessionId) {
    order.payment.sessionId = session.sessionId;
    await order.save();
  }

  res.status(201).json({ orderId: order.id, url: session.url, provider: session.provider });
});

router.get('/mine', async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ orders });
});

async function loadOwnOrder(req) {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order not found');
  const isOwner = order.user.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw notFound('Order not found');
  return { order, isOwner };
}

router.get('/:id', async (req, res) => {
  let { order } = await loadOwnOrder(req);
  order = await syncOrderWithStripe(order);
  res.json({ order });
});

// Only available when Stripe isn't configured: simulates a successful payment.
router.post('/:id/mock-pay', async (req, res) => {
  if (paymentMode() !== 'mock') throw forbidden('Mock payments are disabled when Stripe is configured');
  const { order, isOwner } = await loadOwnOrder(req);
  if (!isOwner) throw forbidden();
  if (order.status !== 'pending') throw badRequest(`Order is already ${order.status}`);
  await markOrderPaid(order.id, { provider: 'mock' });
  res.json({ order: await Order.findById(order.id) });
});

// ---- Admin ----

const adminListSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/', requireRole('admin'), validate(adminListSchema, 'query'), async (req, res) => {
  const { status, page, limit } = req.valid.query;
  const filter = status ? { status } : {};
  const [orders, total, revenue] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email'),
    Order.countDocuments(filter),
    Order.aggregate([
      { $match: { status: { $in: ['paid', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
  ]);
  res.json({
    orders,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    stats: { revenue: revenue[0]?.total ?? 0, paidOrders: revenue[0]?.count ?? 0 },
  });
});

// Allowed fulfilment transitions. Payment itself is only ever confirmed by the payment provider.
const TRANSITIONS = {
  pending: ['cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

router.patch(
  '/:id/status',
  requireRole('admin'),
  blockDemo,
  validate(z.object({ status: z.enum(ORDER_STATUSES) })),
  async (req, res) => {
    const { status } = req.valid.body;
    const order = await Order.findById(req.params.id);
    if (!order) throw notFound('Order not found');
    if (!TRANSITIONS[order.status].includes(status)) {
      throw badRequest(`Cannot change an order from ${order.status} to ${status}`);
    }
    order.status = status;
    await order.save();
    res.json({ order });
  }
);

export default router;
