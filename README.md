# Ebendo — Pay small small

Website for Ebendo Blessing Supply Enterprise (Graphic Road, Accra). Customers pick an item and pay for it in
instalments over 1–6 months using Mobile Money or card through Paystack. **They collect the item only after it is
fully paid.**

Stack: Next.js 15 (App Router) · Supabase (Postgres, Auth, Storage) · Paystack · SMS (Arkesel, swappable) · Vercel.

## How a plan works

1. The customer opens a product, enters their name and phone number, picks 1–6 months and pays a first payment
   (at least 10% by default) → `startPlan` in `src/app/actions.ts` sends them to Paystack.
2. Paystack calls `/api/paystack/webhook`. The webhook re-verifies the payment and runs `record_payment` in the
   database. That function is atomic and idempotent, so a payment is never counted twice. The plan becomes
   `active`, the price is locked, one unit of stock is set aside, and the customer gets an SMS receipt with the
   plan reference.
3. The customer tops up any amount at `/plan/<ref>`. Each payment updates the balance and sends a new receipt.
4. A cron job runs daily at 09:00 UTC (`/api/cron/reminders`). It texts anyone behind an even payment pace or past
   the due date (at most once every 7 days) and cancels plans whose deposit was never paid after 48 hours.
5. When the balance reaches 0, the plan becomes `completed` ("ready for pickup"). Staff hand over the item and
   click **Mark collected** in `/admin`.

Business rules to confirm with the client live in `src/lib/config.ts` (marked `TODO(client)`).

## Setup

1. Create a Supabase project. Run `supabase/migrations/0001_init.sql` in its SQL editor. That also creates the
   `products` storage bucket.
2. In Supabase → Authentication → Users, create a login for each admin (email + password).
3. Copy `.env.example` to `.env.local` and fill it in. List the admin emails in `ADMIN_EMAILS`.
4. Run `npm install` and then `npm run dev`. Open http://localhost:3000, and http://localhost:3000/admin to add products.

### Paystack

- Use the **test** secret key (`sk_test_…`) until Paystack has verified the business.
- In the Paystack dashboard → Settings → API Keys & Webhooks, set the webhook URL to
  `https://<domain>/api/paystack/webhook`. Locally, the `/payment/callback` page records the payment, so the flow
  still works without the webhook.
- Paystack requires an email. Customers who don't give one get a placeholder address built from their phone number.

### SMS

If `SMS_PROVIDER` is empty, messages are only printed to the server log. Set `SMS_PROVIDER=arkesel` along with
`ARKESEL_API_KEY` and an approved `SMS_SENDER_ID` to send real messages. WhatsApp is planned for later, once the
WhatsApp Business API is approved.

### Deploy (Vercel)

Import the repo and add the same environment variables, including `CRON_SECRET`. `vercel.json` already sets up the
daily reminder cron. Set `NEXT_PUBLIC_SITE_URL` to the live domain.

## Out of scope (separate phase)

- Phone locking for unpaid devices
- Buy-now-pay-later (taking the item before full payment)
