import Stripe from 'stripe';
import { config } from '../config.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';

let stripeClient;
let stripeClientKey;

// Without a Stripe key (local dev, CI) we fall back to a mock provider so the full flow still works.
export function paymentMode() {
  return config.stripeSecretKey ? 'stripe' : 'mock';
}

export function getStripe() {
  if (!config.stripeSecretKey) return null;
  if (!stripeClient || stripeClientKey !== config.stripeSecretKey) {
    stripeClient = new Stripe(config.stripeSecretKey);
    stripeClientKey = config.stripeSecretKey;
  }
  return stripeClient;
}

export const FREE_SHIPPING_THRESHOLD = 299900; // ₹2,999
export const SHIPPING_FEE = 9900; // ₹99

export function computeTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return { subtotal, shipping, total: subtotal + shipping };
}

export async function createCheckoutSession(order, customerEmail) {
  const clientUrl = config.clientUrls[0];
  const stripe = getStripe();

  if (!stripe) {
    return { provider: 'mock', url: `${clientUrl}/checkout/mock?order=${order.id}` };
  }

  const lineItems = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: order.currency,
      unit_amount: item.price,
      product_data: { name: item.flavor ? `${item.name} (${item.flavor})` : item.name },
    },
  }));
  if (order.shipping > 0) {
    lineItems.push({
      quantity: 1,
      price_data: { currency: order.currency, unit_amount: order.shipping, product_data: { name: 'Shipping' } },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: customerEmail,
    client_reference_id: order.id,
    metadata: { orderId: order.id },
    success_url: `${clientUrl}/orders/${order.id}?checkout=success`,
    cancel_url: `${clientUrl}/cart?checkout=cancelled`,
    // Releases abandoned orders after 30 minutes (Stripe's minimum).
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  return { provider: 'stripe', url: session.url, sessionId: session.id };
}

// Idempotent: Stripe can deliver the same webhook more than once, and the success page
// may also confirm the payment, so only the first caller moves the order out of "pending".
export async function markOrderPaid(orderId, { provider, paymentIntentId } = {}) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'pending' },
    {
      $set: {
        status: 'paid',
        'payment.provider': provider,
        'payment.paymentIntentId': paymentIntentId,
        'payment.paidAt': new Date(),
      },
    },
    { new: true }
  );
  if (!order) return null;

  await Product.bulkWrite(
    order.items.map((item) => ({
      updateOne: { filter: { _id: item.product }, update: { $inc: { stock: -item.quantity } } },
    }))
  );
  // Stock is checked at checkout, but two buyers could race for the last unit; never go negative.
  await Product.updateMany({ stock: { $lt: 0 } }, { $set: { stock: 0 } });
  return order;
}

export async function cancelPendingOrder(orderId) {
  return Order.findOneAndUpdate({ _id: orderId, status: 'pending' }, { $set: { status: 'cancelled' } }, { new: true });
}

// Used when the customer lands on the success page before the webhook has arrived.
export async function syncOrderWithStripe(order) {
  const stripe = getStripe();
  if (!stripe || order.status !== 'pending' || !order.payment?.sessionId) return order;

  const session = await stripe.checkout.sessions.retrieve(order.payment.sessionId);
  if (session.payment_status === 'paid') {
    await markOrderPaid(order.id, { provider: 'stripe', paymentIntentId: session.payment_intent });
  } else if (session.status === 'expired') {
    await cancelPendingOrder(order.id);
  } else {
    return order;
  }
  // Re-read: the webhook may have updated the order between our check and now.
  return Order.findById(order.id);
}
