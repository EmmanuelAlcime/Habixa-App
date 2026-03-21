# Habixa App — Installation & Setup

## New packages to install

```bash
# State management
npm install zustand

# i18n
npx expo install expo-localization
npm install i18n-js

# Stripe payments
npx expo install @stripe/stripe-react-native

# Date formatting (optional but recommended)
npm install date-fns
```

## Environment variables (.env)

Create a `.env` file in the project root:

```
EXPO_PUBLIC_API_URL=https://api.habixa.com
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_PUSHER_APP_KEY=your-pusher-key
EXPO_PUBLIC_PUSHER_APP_CLUSTER=mt1
EXPO_PUBLIC_PERSONA_TEMPLATE_ID=tmpl_...
EXPO_PUBLIC_DEFAULT_LOCATION=Nassau, Bahamas
```

## Laravel API setup

1. Run the migration:
   ```bash
   php artisan migrate
   ```

2. Add Stripe config to `config/services.php`:
   ```php
   'stripe' => [
       'key'    => env('STRIPE_KEY'),
       'secret' => env('STRIPE_SECRET'),
       'webhook_secret'              => env('STRIPE_WEBHOOK_SECRET'),
       'subscription_webhook_secret' => env('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET'),
       'price_basic' => env('STRIPE_PRICE_BASIC'),
       'price_pro'   => env('STRIPE_PRICE_PRO'),
   ],
   ```

3. Add routes from `laravel-api/api_routes_additions.php` to `routes/api.php`

4. Register webhook endpoints in Stripe Dashboard:
   - `https://api.habixa.com/api/payments/webhook`
   - `https://api.habixa.com/api/subscriptions/webhook`

5. Create Stripe products + prices for Basic ($20/mo) and Pro ($79/mo) plans
   and add the Price IDs to your `.env`

6. Add MySQL FULLTEXT index (in migration or manually):
   ```sql
   ALTER TABLE listings ADD FULLTEXT ft_listings_search (title, description, address, city);
   ```

## New files added to React Native app

| File | Purpose |
|---|---|
| `store/useAppStore.ts` | Zustand global store — profile, tier, search filters |
| `lib/i18n.ts` | Translations: English, Spanish, French |
| `lib/formatters.ts` | Currency + date formatters (multi-locale) |
| `context/PremiumContext.tsx` | Subscription tier, listing limits, boost logic |
| `context/AuthContext.tsx` | Updated — calls store.loadProfile() after login |
| `components/ErrorBoundary.tsx` | Error boundary for tab groups |
| `hooks/useListings.ts` | Updated — pagination, loadMore, landlord score from API |
| `lib/types/listing.ts` | Updated — real landlord score, currency, seeded imgBg |
| `app/(tabs)/(search)/index.tsx` | Updated — FlatList, filter sheet, i18n, real photos |
| `app/(tabs)/(listings)/manage/[id].tsx` | Full manage screen — edit, boost, stats, delete |
| `app/modal/pay-rent.tsx` | Full Stripe PaymentSheet rent payment |
| `app/modal/background-check.tsx` | Stripe + Persona background check |
| `app/modal/upgrade.tsx` | Subscription upgrade modal with plan cards |
| `app/_layout.tsx` | Updated — PremiumProvider + ErrorBoundary wrappers |

## Laravel API files added

| File | Purpose |
|---|---|
| `ListingController.php` | Custom search (replaces Meilisearch), boost, stats |
| `ListingResource.php` | API transformer with real landlord scores + currency |
| `PaymentController.php` | Rent, listing fee, background check + Stripe webhooks |
| `SubscriptionController.php` | Stripe Checkout for subscriptions + webhook handler |
| `RecalculateTrustScore.php` | Queued job — weighted score algorithm |
| `add_monetisation_to_listings.php` | Migration — currency, boost, premium, analytics cols |
| `api_routes_additions.php` | Routes to add to routes/api.php |
