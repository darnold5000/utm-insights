# UTM Insights (utm-insights)

Signal Works campaign analytics hub for multiple products (MeetDayLive, CoachSlate, Signal Works, and future clients).

**Without Supabase env vars**, the app runs as the original **localStorage sales demo** (fictional data).

**With Supabase configured**, it becomes the production dashboard: auth, Postgres events, campaign link builder, and public `POST /api/v1/events` collection.

See `docs/SETUP.md` and `docs/INTEGRATION.md`.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Deploy the Next.js app on Vercel as-is.

## Two-minute path

1. Open **Dashboard**. Content performance shows three simulated Athletes Performance Center Facebook posts. Get Faster Before Tryouts is highlighted because it produced the most customers.
2. Copy a post link or click **Simulate visit**. That post’s visit count increases by one. Refreshing the same visit does not count again.
3. Open **Links** to add another headline under Softball Training. Each post gets its own `utm_content` value.
4. Optional: submit the visit form, mark the lead a customer, and enter a sample amount.
5. Open **Simulator** for the original paid-ad sample. Use **Reset Demo** to restore the sample dataset.

Search engines are blocked (`noindex, nofollow`). This demo is not a live client site.
