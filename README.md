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

Uploaded images are stored in Postgres and served from `/media/<id>`.
