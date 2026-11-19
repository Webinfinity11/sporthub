# SportHub

Georgian sports-equipment shop: storefront + admin panel.
Next.js 16 (App Router), PostgreSQL via Drizzle ORM, plain CSS.

## Local development

```bash
npm install
npm run db:dev        # terminal 1: local Postgres (PGlite) on 127.0.0.1:5433, data in ./.devdb
npm run db:migrate    # first time / after schema changes
npm run db:seed       # first time: test categories, products, hero slides
npm run dev           # terminal 2: http://localhost:3000
```

Settings live in `.env.local` (not committed):

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `ADMIN_USERNAME` | login for `/admin` (default `admin`) |
| `ADMIN_PASSWORD` | password for `/admin` |
| `SESSION_SECRET` | random string (32+ chars) that signs the admin session cookie |

Admin panel: `/admin`.

## Database changes

Edit `src/db/schema.ts`, then:

```bash
npm run db:generate   # writes a new SQL migration into ./drizzle
npm run db:migrate
```

Migrations also run automatically on every `npm start` (Railway).

## Deploy on Railway

1. Push the repo to GitHub and create a Railway project from it.
2. Add a **PostgreSQL** service to the project.
3. In the app service, set variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference to the Postgres service)
   - `ADMIN_USERNAME` = admin login
   - `ADMIN_PASSWORD` = a strong password
   - `SESSION_SECRET` = a long random string (e.g. `openssl rand -hex 32`)
4. Deploy. Build: `npm run build`, start: `npm start` (applies migrations, then starts Next).
5. Fill the shop from `/admin`, or seed test content once with
   `DATABASE_URL=<public url> npx tsx scripts/seed.ts` from your machine.

The build does not need the database; storefront pages read it per request (cached, refreshed when the admin saves).

Uploaded images go to Cloudflare R2 and are served from the bucket's public URL.
Set these variables on Railway (and in `.env.local` to test locally):

- `R2_ACCOUNT_ID` = Cloudflare account ID
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` = an R2 API token with Object Read & Write on the bucket
- `R2_BUCKET` = bucket name
- `R2_PUBLIC_URL` = the bucket's public URL, e.g. `https://media.example.com` or `https://pub-xxxx.r2.dev`

- `MEDIA_SWEEP` = `on` on the live server only: every few hours it deletes uploads older than 24 hours that
  nothing in the database uses (forms that were never saved). Never set it locally when `.env.local` points at
  the production bucket, since the local database does not know the production files.

Photos are resized to at most 2400px and stored as WebP. Hero slides can have a background video (MP4 or WebM,
up to 50 MB) that the browser uploads straight to R2; the bucket needs a CORS rule allowing PUT with
`content-type` and `cache-control` headers. Files removed from a product, category or slide, or belonging to a
deleted one, are deleted from storage unless something else (another item, an old order) still uses them.

Without them uploads fall back to Postgres (`/media/<id>`). To move images already stored in Postgres to R2,
run `npm run media:r2` with production `DATABASE_URL`, check the site, then `npm run media:r2 -- --delete`.
