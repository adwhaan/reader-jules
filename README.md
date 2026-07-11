# Local News Aggregator

A local-first Angular PWA client backed by a small, self-hosted Azure
Functions backend. See `reader-spec-updated.md` for the full functional
specification and `architecture.md` for the layering, patterns, and design
decisions this code implements.

## Layout

```
reader/
├── README.md              — this file
├── AZURE_SETUP.md          — step-by-step Azure deployment guide
├── architecture.md         — architecture document
├── reader-spec-updated.md  — full specification
├── backend/
│   └── ReaderApi.Functions/  — Azure Functions (.NET isolated worker)
└── frontend/                 — Angular PWA client, styled with Tailwind
```

## What's implemented

**Backend** (`backend/ReaderApi.Functions`) — complete for the MVP surface:
`GetSync`/`PutSync` (blob-backed sync document with ETag concurrency),
`FetchFeed` (server-side CORS-free feed retrieval), `EvaluateSelector`
(AngleSharp-based selector extraction), `PruneTombstones` (daily scheduled
cleanup), and `UrlGuard` (SSRF guard shared by the two endpoints that accept
user-supplied URLs).

**Frontend** (`frontend/src/app`) — all four layers are in place:

- **Domain** — models, repository/adapter interfaces (including OPML and
  JSON selector import/export), and the dedup/merge/pruning services. These
  are covered by real, passing unit tests (see Testing below).
- **Application** — `SyncOrchestratorService` (now also exposing a reactive
  `settings` signal and `updateSettings()`), `ArticleStateService`,
  `FeedIngestionService`, `FeedDiscoveryService` (feed preview for the "add
  feed" flow), `ReaderStateService` (the Presentation-facing facade, now
  including folder/feed rename, delete, reorder, and refresh-interval- and
  stagger-aware auto-refresh), `SelectorPreviewService`,
  `OpmlImportExportService`, and `JsonSelectorService`.
- **Infrastructure** — all five IndexedDB repositories, the three
  HTTP-backed adapters (`HttpSyncProvider`, `HttpFeedFetcher`,
  `HttpSelectorEvaluator`), the RSS/Atom parser (now also reading feed-level
  metadata for the "add feed" preview), and the OPML/JSON import-export
  implementations — all wired together in `app.config.ts`.
- **Presentation** — feed tree (with inline rename, delete, and up/down
  reordering for folders), article list, article detail, an "Add feed" flow
  (URL-based RSS/Atom lookup-then-subscribe, and the selector-based path, as
  two modes of one tab), the selector editor (with its sandboxed, scriptless
  preview iframe), the import/export dialog, a settings screen (theme,
  default view, auto-refresh-on-switch, refresh interval, stagger, tombstone
  retention), and a sync status badge — composed in `app.component.ts` into
  a responsive three-pane layout (single-pane, drill-down navigation on
  mobile; three columns side by side from the `md` breakpoint up).

Styling uses Tailwind with a small custom token set (`tailwind.config.js`) —
an editorial/masthead palette (moss green + ochre accents on a warm paper
background, serif display type for headlines, monospace for counts and
timestamps) chosen to fit a personal news reader rather than a generic
admin-panel look. Dark mode is wired end to end (`darkMode: 'class'`,
a theme effect in `AppComponent` that follows the OS preference when set to
"system"), though only the base surfaces have explicit `dark:` classes so
far — see Not yet built.

Refresh behavior now follows the spec's settings: automatic refresh on app
reload for the last-active folder only (unconditional), automatic refresh on
folder switch (gated by `autoRefreshOnFolderSwitch`), a per-feed check
against `refreshIntervalMinutes` so a feed isn't re-fetched more often than
configured, and a `staggerMs` delay between feeds when refreshing a whole
folder at once.

The frontend has been installed and built successfully in a clean
environment (`npm install && ng build`) at every step of this build, as a
sanity check before packaging.

## Testing

Domain-layer logic (deduplication, LWW merge, tombstone pruning) has real,
passing unit tests under `src/app/domain/**/*.spec.ts`, run with Vitest
(chosen over Angular's default Karma/Chrome setup because these are pure
TypeScript functions with no Angular or browser dependency — no TestBed or
browser needed):

```bash
cd frontend
npm install
npm run test:unit
```

Application and Presentation layers (services with Angular DI, components)
aren't covered yet — testing those properly needs Angular's TestBed, which
means the standard Karma + Chrome setup (`npm test`, i.e. `ng test`) rather
than Vitest. The scaffolding for that isn't included yet.

## Not yet built

- Application/Presentation test coverage (see Testing above).
- Full dark-mode styling — the theme mechanism (settings, persistence,
  system-preference following) works end to end, but only the header and a
  few base surfaces have `dark:` classes so far; most components would still
  need their own dark-mode classes added.
- Drag-and-drop reordering — folders can be moved up/down via buttons in the
  feed tree; there's no drag-and-drop, and feeds within a folder can't be
  reordered yet (only folders can).
- An explicit "N changes pending" sync indicator beyond the status badge's
  syncing/offline/conflict states.

## Getting started

See `AZURE_SETUP.md` for provisioning the backend, then:

```bash
cd frontend
npm install
npm start
```

The default `environment.ts` points at a local Functions Core Tools instance
(`http://localhost:7071/api`) — see `AZURE_SETUP.md` §8 for running that
locally before you need real Azure resources.
