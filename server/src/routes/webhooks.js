import express, { Router } from 'express';
import { config } from '../config.js';
import { cancelPendingOrder, getStripe, markOrderPaid } from '../lib/payments.js';

const router = Router();

// Stripe signs the raw request body, so this route must not go through express.json().
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe || !config.stripeWebhookSecret) {
    return res.status(503).json({ error: 'Stripe webhooks are not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripeWebhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  const session = event.data.object;
  const orderId = session.metadata?.orderId;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      if (orderId && session.payment_status === 'paid') {
        await markOrderPaid(orderId, { provider: 'stripe', paymentIntentId: session.payment_intent });
      }
      break;
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      if (orderId) await cancelPendingOrder(orderId);
      break;
    default:
      break;
  }

  res.json({ received: true });
});

export default router;
