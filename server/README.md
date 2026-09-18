# Blog API

Headless NestJS service for blog articles. It stores posts in PostgreSQL, generates unique slugs from titles, and supports cursor pagination plus Postgres full-text search.

## Stack

- NestJS 11 (Express)
- Prisma 7 with the `pg` driver adapter
- PostgreSQL 18
- Swagger (`/api`) when `NODE_ENV` is not `production`
- Terminus health check that pings the database

Node 24 is what CI and the Docker images use.

## Setup

From this directory:

```bash
cp .env.example .env
npm ci
npx prisma generate
```

Fill in `.env`. Compose interpolates `DB_USER`, `DB_PASSWORD`, and `DB_NAME` from `.env` in this folder. The Nest process reads `DATABASE_URL`.

| Variable | Purpose |
| --- | --- |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Postgres role and database (Compose + `pg_isready`) |
| `DATABASE_URL` | Prisma connection string |
| `PORT` | HTTP port (defaults to `3000`) |
| `NODE_ENV` | `production` disables Swagger |
| `CORS_ORIGINS` | Comma-separated allowed origins (defaults to `http://localhost:3000`) |

`DATABASE_URL` host depends on where Nest runs:

- Nest on the host, Postgres in Compose: `localhost:5433` (Compose publishes `5433:5432`)
- Nest on the host, Postgres on your machine: `localhost:5432`
- Nest in Compose: hostname `db` on port `5432` (see `.env.test`)

Apply migrations after Postgres is up:

```bash
npx prisma migrate deploy --config ./prisma7.config.ts
```

Schema changes during development:

```bash
npx prisma migrate dev --config ./prisma7.config.ts --name <migration_name>
```

## Run

### Docker Compose (Postgres + migrate + API)

```bash
docker compose up --build
```

This starts Postgres, runs `prisma migrate deploy`, then the Nest dev server. The API is at [http://localhost:3001](http://localhost:3001). The server container loads `.env.test`, whose `DATABASE_URL` points at the `db` service.

Postgres only:

```bash
docker compose up db -d
```

Then run Nest on the host (`npm run start:dev`) with `DATABASE_URL` aimed at `localhost:5433`.

### Local Nest

```bash
npm run start:dev
```

| Script | What it does |
| --- | --- |
| `npm run start:dev` | Watch mode |
| `npm run start:debug` | Watch + debugger |
| `npm run build && npm run start:prod` | Compile and run `dist/main` |

## HTTP API

Base URL is `/`. Interactive docs: [http://localhost:3000/api](http://localhost:3000/api) (or port `3001` under Compose).

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/` | Welcome text |
| `GET` | `/health` | Prisma `SELECT 1`; **200** if the DB is reachable, **503** otherwise |
| `POST` | `/articles` | Body: `{ "title", "body" }`. Slug is derived from the title (`my-title`, then `my-title-1` on collision) |
| `GET` | `/articles` | Query: `limit` (1–100, default 25), `cursorId` (UUID), `search`. `cursorId` and `search` cannot be combined |
| `GET` | `/articles/:slug` | **404** if missing |
| `PATCH` | `/articles/:id` | UUID. At least one of `title` or `body`. Title changes regenerate the slug |
| `DELETE` | `/articles/:id` | UUID |

List without `search` is newest-first cursor pagination. `search` uses `plainto_tsquery` on a generated `tsvector` and ranks by relevance.

Article JSON:

```json
{
  "id": "uuid",
  "title": "First article",
  "slug": "first-article",
  "body": "Hello world",
  "createdAt": "2026-09-17T00:00:00.000Z",
  "updatedAt": null
}
```

## Tests

```bash
npm run test          # unit
npm run test:e2e      # needs a migrated database and DATABASE_URL
npm run test:cov      # coverage
npm run lint
npx tsc --noEmit
```

E2E expects Postgres (local or CI service) and:

```bash
npx prisma migrate deploy --config ./prisma7.config.ts
npx prisma generate
```

CI (`.github/workflows/ci-main.yml`) runs typecheck, lint, unit tests, and build on server changes. Image builds (`prod`, `migrate`) and e2e run on `main`.

## Docker images

The [Dockerfile](./Dockerfile) has four targets:

| Target | Role |
| --- | --- |
| `deps` | `npm ci` + `prisma generate` |
| `dev` | watch server (Compose `server` service) |
| `migrate` | `prisma migrate deploy` |
| `prod` | `node dist/main.js` as a non-root user |

```bash
docker build --target prod .
docker build --target migrate .
```

The production image does not copy Prisma schema or run migrations. Run the `migrate` target (or `prisma migrate deploy`) against the same `DATABASE_URL` before serving traffic.
