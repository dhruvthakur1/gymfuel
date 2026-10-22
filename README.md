# GymFuel — Sports Nutrition E-Commerce

![CI](https://github.com/dhruvthakur1/gymfuel/actions/workflows/ci.yml/badge.svg)

A full-stack store for fitness supplements: customers browse and filter products, pay through Stripe Checkout, and track
their orders; admins manage the catalogue and fulfil orders.

**Live demo:** [gymfuel-nu.vercel.app](https://gymfuel-nu.vercel.app) ·
**API health:** [gymfuel-api.onrender.com/api/health](https://gymfuel-api.onrender.com/api/health)

> Try it without signing up: on the login page click **Demo customer** or **Demo admin (read-only)**.
> Payments run in Stripe test mode — use card `4242 4242 4242 4242`, any future expiry date and any CVC.
> The API is on Render's free tier, so the very first request after a quiet spell can take ~30 seconds.

## Features

- **Catalogue** — search across name, brand and tags; filter by category, brand, price and stock; sort and paginate.
  All filter state lives in the URL, so results are shareable.
- **Auth** — JWT authentication with bcrypt-hashed passwords, rate-limited login, and role-based authorization
  (`customer` / `admin`). A public demo admin can view everything but is blocked from changing data.
- **Checkout** — prices, stock and shipping are always recalculated on the server, so a tampered cart can't change what's charged.
  Payments go through **Stripe Checkout**; a signed **webhook** marks the order paid and decrements stock.
- **Reliable payments** — the webhook handler verifies Stripe's signature and is idempotent (duplicate deliveries
  don't double-decrement stock). If the customer returns before the webhook arrives, the order page confirms
  the payment directly with Stripe. Abandoned sessions expire after 30 minutes and the order is cancelled.
- **Admin dashboard** — revenue and order stats, order status workflow (`paid → shipped → delivered`, with invalid
  transitions rejected), and product create / edit / delete.
- **Tested** — 22 API tests (Vitest + Supertest + in-memory MongoDB) covering auth, authorization, catalogue queries,
  checkout pricing, stock rules and Stripe webhook signatures. They run on every push via GitHub Actions.

## Tech stack

| Layer    | Tech                                                                  |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 18, React Router, Vite — deployed on **Vercel**                 |
| Backend  | Node.js, Express 5, Mongoose, Zod validation, Helmet, rate limiting   |
| Data     | MongoDB Atlas                                                         |
| Payments | Stripe Checkout + webhooks (test mode)                                |
| DevOps   | Docker, GitHub Actions CI, **Render** (API)                           |

## Architecture

```
 React (Vercel) ──REST + JWT──▶ Express API (Render, Docker) ──▶ MongoDB Atlas
        │                               ▲
        └──redirect──▶ Stripe Checkout ─┘ webhook: checkout.session.completed
```

```
server/
  src/
    app.js            Express app: security middleware, routes, error handling
    routes/           auth, products, orders, Stripe webhooks
    models/           User, Product, Order (Mongoose)
    middleware/       JWT auth + roles, Zod validation, error handler
    lib/payments.js   Stripe Checkout sessions, idempotent "mark paid", mock provider
    seed.js           Demo catalogue and accounts
  test/               API tests
client/
  src/
    pages/            Shop, Product, Cart/checkout, Orders, Auth, Admin
    context/          Auth and cart state (cart persisted to localStorage)
```

### API overview

| Method | Endpoint                         | Access   |
| ------ | -------------------------------- | -------- |
| POST   | `/api/auth/register`, `/login`   | Public   |
| GET    | `/api/auth/me`                   | User     |
| GET    | `/api/products?q=&category=&brand=&minPrice=&maxPrice=&inStock=&sort=&page=` | Public |
| GET    | `/api/products/facets`, `/api/products/:slug` | Public |
| POST / PATCH / DELETE | `/api/products/:id` | Admin |
| POST   | `/api/orders/checkout`           | User     |
| GET    | `/api/orders/mine`, `/api/orders/:id` | User (own orders) |
| GET    | `/api/orders`                    | Admin    |
| PATCH  | `/api/orders/:id/status`         | Admin    |
| POST   | `/api/webhooks/stripe`           | Stripe (signed) |

## Run locally

Requires Node.js 20+. No database or Stripe account needed: without `MONGODB_URI` the API starts an in-memory
MongoDB with demo data, and without `STRIPE_SECRET_KEY` checkout uses a simulated payment page.

```bash
cd server && npm install && npm run dev     # API on http://localhost:4000
cd client && npm install && npm run dev     # App on http://localhost:5173
cd server && npm test                       # API tests
```

Demo logins: `demo@gymfuel.dev` / `demo12345` (customer), `demo.admin@gymfuel.dev` / `demoadmin123` (read-only admin),
`admin@gymfuel.dev` / `ChangeMe-Admin-123` (full admin, local only).

To test real Stripe payments locally, put your test keys in `server/.env` and forward webhooks with the
[Stripe CLI](https://docs.stripe.com/stripe-cli): `stripe listen --forward-to localhost:4000/api/webhooks/stripe`.

## Deploy

See [DEPLOY.md](DEPLOY.md) for the step-by-step guide (MongoDB Atlas → Render → Vercel → Stripe webhook).
