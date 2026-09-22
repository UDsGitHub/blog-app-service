- [ ] start buidling out frontend
- [ ] add redis caching to the backend
- [ ] update unit tests and e2e tests based on current checked changes for API 
- [ ] include excerpt in select for non-search article list and exclude body. derive excerpt from body if excerpt is empty

Plan: see PLAN.md. API first, then UI.

## API
- [ ] access key guard: no key = published only (list, search, by-slug 404 for non-published); key required for POST/PATCH/DELETE
- [x] search sql filters by status
- [x] remove console.log in article.service findAll
- [x] migration: add `excerpt` (nullable varchar 300) and `publishedAt` (nullable timestamptz)
- [x] set publishedAt on first transition to PUBLISHED (never reset)
- [ ] migration: `article_slug_history` (slug unique, article_id fk cascade, created_at)
- [x] slug history: record old slug when a published article's title changes; getSlug checks both tables; findBySlug falls back to history
- [x] get article by id endpoint for the studio (decide path)
- [ ] list responses omit body, return excerpt (stored or derived from markdown)
- [x] search results return ts_headline snippet instead of body
- [x] list ordering: PUBLISHED by publishedAt desc, others by createdAt desc (decide)
- [x] date range filter (from/to on publishedAt)
- [ ] webhook module: signed payload, WEBHOOK_URLS env, publish-affecting events only
- [ ] ETag + Cache-Control on list and detail
- [ ] update tests for all of the above

## Portfolio (~/code/apps/portfolio)
- [ ] revalidate route handler: verify HMAC, revalidateTag('articles')
- [ ] blog page: fetch published articles, render markdown, redirect when returned slug differs from requested

## Studio (client, Vite + RTK Query)
- [ ] pick stack: Tailwind, shadcn/ui, router, markdown editor + sanitized preview
- [ ] api key prompt + localStorage (no VITE_ env for the key)
- [ ] top bar + cmd-K search palette
- [ ] left list: status tabs, infinite scroll (RTK infiniteQuery), tag invalidation on every mutation
- [ ] editor pane + action bar (new/draft/published states), toast feedback
- [ ] post settings panel (excerpt now; slug, cover image, tags later)
- [ ] filter drawer (date range, later tags)
- [ ] unsaved changes guard when switching articles
- [ ] mobile layout

## Later
- [ ] cloudinary cover image + body image upload
- [ ] tags (text[] + GIN index) and tag filter
