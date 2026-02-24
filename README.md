# freemovers

A Japan-focused moving marketplace that connects customers who need to move with
drivers who can help. Customers request quotes, negotiate with drivers, and
communicate about jobs, while drivers browse and accept move requests. The app
uses phone-number OTP authentication, supports a Japanese-first UI
(`NEXT_PUBLIC_DEFAULT_LOCALE=ja`), and notifies users via Twilio (WhatsApp/SMS)
and LINE for move requests and updates.

## Tech stack

- **Next.js 15** (App Router) with **React 19**
- **TypeScript**
- **SQLite** via `better-sqlite3` for the data layer
- **Tailwind CSS** with a shadcn-style UI (`class-variance-authority`, Radix UI primitives, `lucide-react`)
- **Twilio Verify** for phone OTP authentication
- **LINE** and **WhatsApp** (Twilio) for customer/driver notifications
- **Zod** + **react-hook-form** for form validation
- **Leaflet** for map/location features

## Data layer

For local development the app uses a local SQLite database file at
`data/freemovers.sqlite`. This file is gitignored (along with `*.sqlite` and
`/data/`) and is **not** intended to be the production data store. It exists to
make local development and testing easy without external infrastructure.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. The following
variables are referenced in `src/lib/server/*` and `.env.example`:

| Variable | Description | Required |
| --- | --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | Twilio WhatsApp sender phone number ID | Required for WhatsApp notifications |
| `WHATSAPP_ACCESS_TOKEN` | Twilio API access token | Required for WhatsApp notifications |
| `WHATSAPP_TEMPLATE_NAME` | Default WhatsApp template name | Required for WhatsApp notifications |
| `WHATSAPP_TEMPLATE_NAME_MOVE_REQUEST` | WhatsApp template for move requests | Required for move-request notifications |
| `WHATSAPP_TEMPLATE_LANG` | WhatsApp template language (e.g. `en_US`, `ja`) | Optional (defaults to `en_US`) |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE channel access token | Required for LINE notifications |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default UI locale (e.g. `ja`) | Optional (defaults to `ja`) |
| `NEXT_PUBLIC_API_BASE_URL` | Public base URL used by the client | Optional |
| `SESSION_SECRET` | Secret used to sign the session cookie | Required in production (dev falls back to an insecure default) |

> Never commit real secrets. `.env*` files are gitignored.

## Setup

```bash
npm install
cp .env.example .env.local   # then edit .env.local and fill in the values
npm run dev                  # http://localhost:3000
```

## Scripts

- `npm run dev`: start the Next.js dev server
- `npm run build`: production build
- `npm run start`: start the production server
- `npm run lint`: run ESLint

## Auth

Authentication is session-based: after phone OTP verification, the server issues
a signed `httpOnly` session cookie. A middleware enforces protected routes by
validating this cookie, redirecting unauthenticated requests as needed. The
session cookie is signed using `SESSION_SECRET` (see above).

Phone verification is self-managed. No external SMS/Twilio account is required
to run the app locally. OTP codes are generated locally, stored (SHA-256 hashed)
in SQLite with a 5-minute expiry, and rate-limited; in development the code is
logged to the console and returned from `POST /api/auth/phone/start` as
`dev_code`. To deliver codes for real, replace `deliverOtp` in
`src/lib/server/otp.ts` with an email or SMS call.

Notification routing supports `line`, `whatsapp`, and `sms` as preferred
channels and falls back to other channels if one fails. LINE and WhatsApp send
for real when their env vars are set; SMS has no external provider wired up and
currently logs to the server console (see `src/lib/server/sms.ts`).

## Admin dashboard & feature flags

An admin dashboard at `/admin/dashboard` lets an administrator enable/disable
product features (phone OTP, notification channels, guest moves, quoting, map
picker, JP postal lookup, etc.) at runtime, with no redeploy needed.

- **Admin account** is seeded on database init when `ADMIN_EMAIL` and
  `ADMIN_PASSWORD` are set in `.env.local`. There is no self-service admin
  signup (the public `/api/auth/register` endpoint rejects `user_type: admin`).
- Sign in at `/admin-login`.
- **Feature flags** are defined in `src/lib/server/feature-flags.ts` and stored
  in the `feature_flags` SQLite table. Defaults are all-on.
  - `GET /api/flags`: public, returns the `{ key: enabled }` map the client
    uses to hide/disable UI.
  - `GET/PUT /api/admin/flags`: admin-only, reads full metadata and toggles a flag.
- Enforcement is **UI-only**: disabled features are hidden/disabled in the
  client via the `useFeatureFlag(key)` hook
  (`src/components/providers/FeatureFlagsProvider.tsx`). APIs are unchanged; a
  server-side `isFeatureEnabled()` helper exists for future hard enforcement.
