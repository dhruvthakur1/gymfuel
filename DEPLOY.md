# Deploying GymFuel (free tier, ~30 minutes)

You'll set up four free accounts: **GitHub**, **MongoDB Atlas**, **Render** (API) and **Vercel** (frontend), plus
**Stripe** in test mode. Do the steps in order — each one gives you a value the next one needs.

Keep a note open while you go; you'll collect: `MONGODB_URI`, the Render URL, the Vercel URL, and two Stripe keys.

---

## 1. Push the code to GitHub

1. Create an empty **public** repository named `gymfuel` at https://github.com/new (no README, no .gitignore).
2. From the `gymfuel` folder:
   ```bash
   git remote add origin https://github.com/<your-username>/gymfuel.git
   git push -u origin main
   ```
3. Open the **Actions** tab — the CI workflow should go green (tests, client build, Docker build).

## 2. MongoDB Atlas (database)

1. Sign up at https://www.mongodb.com/cloud/atlas/register and create a **free M0 cluster**.
2. **Database Access** → add a database user with a generated password (save it).
3. **Network Access** → add IP address `0.0.0.0/0` (Render's free tier has no fixed IP).
4. **Connect → Drivers** → copy the connection string and insert your password and a database name:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/gymfuel?retryWrites=true&w=majority
   ```
   This is your `MONGODB_URI`.

## 3. Stripe (test mode)

1. Sign up at https://dashboard.stripe.com/register. You can stay in **test mode** — no business verification needed.
2. **Developers → API keys** → copy the **Secret key** (`sk_test_…`). This is `STRIPE_SECRET_KEY`.
3. Leave this tab open; you'll create the webhook in step 6 once the API has a URL.

## 4. Render (API)

1. Sign up at https://render.com with your GitHub account.
2. **New → Blueprint** → pick the `gymfuel` repo. Render reads `render.yaml` and creates the `gymfuel-api` service.
3. Fill in the environment variables it asks for:
   | Key | Value |
   | --- | --- |
   | `MONGODB_URI` | from step 2 |
   | `CLIENT_URL` | `http://localhost:5173` for now — you'll update it in step 5 |
   | `STRIPE_SECRET_KEY` | from step 3 |
   | `STRIPE_WEBHOOK_SECRET` | leave blank for now |
   | `ADMIN_PASSWORD` | a strong password for your private admin account |
   `JWT_SECRET` is generated automatically.
4. Wait for the deploy, then open `https://<your-service>.onrender.com/api/health`. You should see
   `{"status":"ok","db":"connected","payments":"stripe"}`.
5. Load the demo products and accounts into Atlas from your computer (Render's free tier has no shell).
   In PowerShell:
   ```powershell
   cd server
   $env:MONGODB_URI = "<your connection string>"
   $env:ADMIN_PASSWORD = "<a strong password for your private admin>"
   npm run seed
   ```
   You should see `Seeded 14 products and 3 users`. Close the window afterwards so the values aren't kept.
   (You can do this before step 4 too — it only needs the database.)

## 5. Vercel (frontend)

1. Sign up at https://vercel.com with GitHub → **Add New → Project** → import `gymfuel`.
2. Set **Root Directory** to `client`. Vercel detects Vite automatically.
3. Add the environment variable `VITE_API_URL` = `https://<your-service>.onrender.com` (no trailing slash).
4. Deploy and copy your URL, e.g. `https://gymfuel-yourname.vercel.app`.
5. Back in **Render → Environment**, set `CLIENT_URL` to that Vercel URL and save (it redeploys).
   This is what allows the browser to call the API (CORS) and where Stripe sends customers after paying.

## 6. Stripe webhook

1. **Stripe → Developers → Webhooks → Add endpoint**
   - URL: `https://<your-service>.onrender.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
2. Copy the **Signing secret** (`whsec_…`) into Render as `STRIPE_WEBHOOK_SECRET`.

## 7. Test it end to end

1. Open your Vercel URL → **Log in → Demo customer**.
2. Add something to the cart → fill the address → **Pay**. Stripe Checkout opens.
3. Pay with `4242 4242 4242 4242`, any future date, any CVC.
4. You land on the order page and it shows **Paid**. In Stripe → Webhooks you should see a `200` delivery.
5. Log in as **Demo admin** → the order and revenue appear on the dashboard.

## 8. Keep it fast for recruiters

Render's free tier sleeps after 15 minutes without traffic, and the first request then takes ~30–50 seconds.
Create a free monitor at https://uptimerobot.com that hits `https://<your-service>.onrender.com/api/health`
every 5 minutes.

## 9. Finish the README

Put your Vercel and Render URLs at the top of `README.md`, fix the CI badge username if yours differs from
`dhruvthakur1`, add a screenshot, and push.

---

### Troubleshooting

- **"Could not reach the server"** in the app — the API is waking up (wait 30 s), or `VITE_API_URL` is wrong.
  Changing a `VITE_` variable needs a **redeploy** on Vercel because it's baked in at build time.
- **CORS errors in the browser console** — `CLIENT_URL` on Render must match your Vercel URL exactly
  (https, no trailing slash). Several origins can be comma-separated.
- **Order stays "pending" after paying** — check the webhook's recent deliveries in Stripe. A `400` means
  `STRIPE_WEBHOOK_SECRET` is wrong. The order page also asks Stripe directly, so a refresh usually fixes it.
- **Login fails for demo accounts** — the seed step (4.5) hasn't been run against Atlas.
