# Supabase setup

1. Create a Supabase project for the analytics app.
2. Run **only** `supabase/migrations/001_analytics_platform.sql` once in the SQL editor. There are no other migrations in this repo. If you see `policy … already exists`, the schema is already applied — do not re-run the whole file unless you use the updated idempotent version (with `drop policy if exists`).
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose to the browser)
4. In Supabase Auth, create your admin user (email + password).
5. Grant dashboard access:

```sql
insert into public.sw_project_admins (user_id)
select id from auth.users where email = 'you@example.com'
on conflict do nothing;
```

6. Optional: set a server conversion secret for high-value events per project:

```sql
update public.sw_projects
set conversion_secret_hash = encode(digest('your-long-random-secret', 'sha256'), 'hex')
where public_key = 'pk_mdl_dev_seed_001';
```

Use the same plaintext secret as `Authorization: Bearer <secret>` on `POST /api/v1/events/server`.

7. Deploy to Vercel with the same environment variables.

When all three public Supabase vars plus the service role key are set, the app switches from the localStorage demo to live mode and protects the dashboard with login.