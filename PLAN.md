# Blog Studio: System and Frontend Plan (draft 3)

Status: planning only. The owner is making the API changes manually. Items marked **[open]** need a decision.

## 1. Goals

- The blog API is the single source of truth. This app (the "studio") is one consumer and the only writer.
- Studio capabilities: read, create, edit, delete, publish and unpublish articles.
- Other consumers (e.g. `~/code/apps/portfolio`, Next.js 16) only read published articles.
- Creating or updating a published article must make consumers pick up the change quickly.

## 2. Consumers and change propagation

Consumers pull. The API pushes only to server-side consumers that cache.

| Consumer type | Mechanism |
|---|---|
| Server-cached (Next portfolio) | API sends a signed **webhook** on publish-affecting events. Portfolio route handler verifies the signature and calls `revalidateTag('articles')`. |
| Client apps (studio, future SPAs) | RTK Query cache: tag invalidation after own mutations, refetch on focus. |
| Everyone (baseline) | `ETag` plus `Cache-Control: s-maxage=60, stale-while-revalidate` on `GET /articles`, so a failed webhook is bounded to about 1 minute of staleness. |

Events that fire the webhook:

- create with status `PUBLISHED`
- edit of an article that is `PUBLISHED`
- any status change into or out of `PUBLISHED`
- delete of a `PUBLISHED` article
- slug change of a published article. The payload includes the old and new slug.

Draft saves fire nothing. Consumer URLs come from an env var at first (`WEBHOOK_URLS`). Delivery is fire-and-forget with 1-2 retries. Payload is HMAC-signed.

Not doing: SSE or websockets. Server-side consumers have no live client to notify, and a blog does not need realtime.

## 3. Pagination and search

- **List** uses cursor pagination (`limit`, `cursorId`, `hasMore`), scoped by `status`. The next cursor is the id of the last item in the fetched page.
- **Stale cursor: accepted, no keyset cursor.** If the cursor row is deleted, the next request returns an empty page (unverified, worth a test). The studio avoids this because every mutation invalidates the list tag, which refetches from page one and recomputes cursors. The only gap is a delete made in another tab or device, which is negligible for a single-user tool.
- **Search** is full-text, top-N by relevance, with no cursor (the API rejects `cursorId` with `search`).
- UI consequence: browsing is the list (infinite scroll), and searching is the command palette (top N results, "refine your query" footer). The two are separate tools.
- Search results return a highlighted snippet (`ts_headline`) instead of the body.
- **List ordering [open]:** `PUBLISHED` sorts by `publishedAt desc`. Other statuses sort by `createdAt desc` (or `updatedAt`, for "recently edited" drafts). The API picks the sort key from the `status` filter. `id desc` stays as the tie-breaker.

## 4. Layout and flow

```
┌────────────────────────────────────────────────────────────────┐
│ ✎ Blog Studio        [ 🔍 Search articles…        ⌘K ]  [+ New]│
├───────────────────┬────────────────────────────────────────────┤
│ [Published|Drafts|│  Title ______________________________  [⚙] │
│  Archived]   [⚙]  │  ┌─────────────────────┬─────────────────┐ │
│ ───────────────── │  │ Markdown            │ Preview         │ │
│ ▸ Article title   │  │                     │                 │ │
│   Draft · 2d ago  │  │                     │                 │ │
│ ▸ Article title   │  └─────────────────────┴─────────────────┘ │
│ ▸ …  (infinite    │ ────────────────────────────────────────── │
│      scroll)      │  <actions depend on article state, see 5>  │
└───────────────────┴────────────────────────────────────────────┘
```

- Top bar: app title, wide search trigger (opens the ⌘K palette), New button.
- Left: status tabs plus a filter button. The filter button opens a drawer (side on desktop, bottom sheet on mobile). It is hidden until there is more than one filter. Date range and tags are the planned filters. Below is the infinite-scroll list.
- Right: editor with title, markdown editor with preview toggle, and a sticky action bar.
- **Post settings panel (editor's [⚙]):** a slide-over that holds the non-body fields: excerpt now, and later slug, cover image and tags. This replaces "navigate to another page after saving", which interrupts writing and needs a navigation guard. The same panel is available before the first save.
- Selecting an article sets the route `/articles/:id`. The studio loads the full article by id (list responses have no body). Switching away from unsaved edits prompts save or discard.
- Mobile: list is full screen, tapping opens the editor full screen with a back button, and the palette becomes a full-screen sheet.

## 5. Editor action states (intentional saves, no autosave)

| Article state | Actions | Result |
|---|---|---|
| New (unsaved) | Discard, Save draft, Publish | Toast: "Saved to drafts". Publish creates with `PUBLISHED`. |
| Draft | Discard changes, Save draft, Publish | Publish sets `PUBLISHED`. |
| Published | Discard changes, **Update**, Unpublish | Update saves changes live. Unpublish reverts to `DRAFT`. |
| Any | Overflow menu: Archive, Delete (confirm dialog) | |

"Save draft" is never offered on a published article, because it would silently unpublish it. Feedback is a toast (not a modal), which may carry a "Publish now" action.

## 6. Data model and API changes

### Schema additions

- `excerpt` (nullable, `VarChar(300)`): author-written. When null, the API derives one from the body on read (strip markdown, about 160 characters). Never stored, so it cannot go stale.
- `publishedAt` (nullable `timestamptz`): set the first time the status becomes `PUBLISHED`, never cleared or reset by unpublishing or republishing. Uses:
  - public display date and list ordering
  - date-range filter for public consumers
  - decides whether a slug change needs a history row
- `article_slug_history` table (see below).
- Future: `coverImageUrl`, `tags text[]` with a GIN index. See section 9.

### Slug rule: dynamic, with a history table

- The slug always follows the title (`getSlug` on title change).
- History table: `article_slug_history(slug unique, article_id FK on delete cascade, created_at)`.
- When a title edit changes the slug of an article with `publishedAt` set, insert the old slug into the history. Slugs of never-published articles are not recorded, since nobody could have linked to them.
- History rows point to the **article id**, not to the next slug, so renames never form redirect chains.
- `GET /articles/:slug`: look up `article.slug`, then fall back to the history table. On a history hit, return the article as normal (200). The response carries the current slug, and the consumer compares it to the requested slug and issues a permanent redirect (Next: `permanentRedirect`).
- `getSlug` uniqueness checks both tables, so a new article cannot claim a slug that an old URL still redirects from. If an article reclaims one of its own old slugs, delete that history row.
- Deleting an article cascades its history, so old URLs 404.

### Endpoint changes

Done (by owner):
- [x] `status` filter on list, no forced default
- [x] `updatedAt` set on update
- [x] search result includes `status`

To do (order: API first, then UI):
- [ ] Access guard (section 7), covering list, search and `findBySlug`
- [ ] Search SQL filters by `status`
- [ ] Remove `console.log('status passed')` in `article.service.ts`
- [ ] `GET` article by id for the studio (authed). List has no body, and slugs are not stable route keys. **[open]** path: `/articles/id/:id`, or UUID detection on `:slug`.
- [ ] List responses omit `body`. Return `excerpt` (stored or derived).
- [ ] Add `excerpt` and `publishedAt` columns and the slug history table (migration)
- [ ] Slug history logic in create, update and `findBySlug`
- [ ] Date-range filter params (`from`, `to` on `publishedAt`), compatible with cursor pagination
- [ ] Webhook module (section 2)
- [ ] `ETag` and `Cache-Control` on list and detail

## 7. Auth and access

- CORS restricts browsers only. `curl`, server-side fetches and the portfolio's server ignore it, so it is not access control.
- **Single rule, one guard:** requests without the key can only see `PUBLISHED` content (list, search and by-slug; a non-published slug returns 404, not 403). Requests with the key can see everything and can POST, PATCH and DELETE.
- Consumers such as the portfolio never need the key, because public reads are always published-only. Only the studio holds it.
- **Key storage in the studio (a Vite SPA):**
  - `VITE_*` env vars are inlined into the JS bundle at build time, so anyone who opens the studio URL can read the key.
  - Instead: prompt for the key on first load and keep it in localStorage. It never ships in the bundle.
  - Sanitize rendered markdown in the preview (e.g. `rehype-sanitize`), since an XSS on the origin could read localStorage.
  - **[open]** If the studio is only ever run on localhost, a `VITE_` env var is acceptable.

## 8. Frontend stack

- Studio: Vite + React 19 + TypeScript (existing `client/`).
- Data layer: RTK Query. Tags for the list and per-article invalidation, `infiniteQuery` for the scroll list, `setupListeners` for refetch on focus.
- UI: Tailwind plus shadcn/ui (cmdk for the palette, vaul for drawers), markdown editor with preview.

## 9. Future: images and tags

- **Images (Cloudinary):** the browser uploads directly to Cloudinary, using a server-signed upload or an unsigned preset. The article stores the returned `secure_url` (cover image column). Body images are inserted into the markdown as URLs. Consumers can add transformations to the URL (width, format).
- **Tags:** `tags text[]` on `article`, lowercased, with a GIN index. Filtering is `tags @> ARRAY[...]` and works with cursor pagination. Tag filter goes in the same filter drawer as date range. If tag metadata or one-place renames are ever needed, migrate to normalized tables.

## 10. Decisions log

- Single-user tool. Studio is a Vite SPA. Portfolio is Next.js 16 at `~/code/apps/portfolio`.
- Body is markdown, rendered by consumers.
- Pull plus webhook for propagation.
- Intentional drafts (no autosave).
- API fixes before UI.
- Layout approved: top-bar search and ⌘K palette, status tabs, left list, right editor, post settings panel.
- Excerpt column authored in the post settings panel, with a derived fallback.
- Slug is dynamic with a history table and consumer-side redirect.
- Access key guards non-published reads and all writes.
- RTK Query as the data layer.
- Stale cursor accepted, mitigated by tag invalidation.
