# Architecture Document — Local News Aggregator

Companion to `reader-spec.md`. Describes how the specification is
implemented: layering, patterns, folder structure, backend, sync strategy,
fetch strategy, and security boundaries.

## 1. Overview

The app is a local-first Angular PWA client backed by a small, self-hosted
serverless backend. All working state lives client-side in IndexedDB; the
backend holds one authoritative JSON sync document plus two stateless
proxy/scraping endpoints. This split exists specifically to make the app
work identically on desktop **and mobile** browsers — the browser-only
approach explored earlier hit a hard platform wall (§8) that no amount of
client-side workaround could fully close.

The architecture still follows four layers with a strict dependency rule:
**Presentation → Application → Domain ← Infrastructure**. Domain never
depends on Angular, the browser, or any storage/fetch/backend mechanism —
Infrastructure depends on Domain by implementing the interfaces Domain
defines. Moving from a browser-only design to a thin-backend design changed
almost nothing above the Infrastructure layer, which is the point of that
boundary.

## 2. Layers

### 2.1 Domain (`src/app/domain`)

Pure TypeScript. No Angular imports, no browser APIs, fully unit-testable in
isolation.

- **Models** — `FeedDefinition`, `FolderDefinition`, `ArticleItem`,
  `ArticleState`, `SelectorConfig`, `UserSettings`, `SyncDocument` (Appendix A).
- **Repository interfaces** — `ArticleRepository`, `StateRepository`,
  `FeedRepository`, `FolderRepository`, `SelectorConfigRepository`.
- **Adapter interfaces** — `FeedFetcher`, `SelectorEvaluator`, `SyncProvider`.
- **Domain services** (logic only, no I/O):
  - Deduplication: `normalizeLink()`, `buildCompositeId()`.
  - OPML/JSON mapping rules.
  - Tombstone pruning rule (given a retention window, decide what to drop) —
    the client-side rule mirrors the server-side one for offline consistency.
  - LWW comparison (`isNewer(a, b)` on `updatedAt`).

### 2.2 Application (`src/app/application`)

Angular injectable services — the use-case layer, orchestrating Domain logic
against Infrastructure implementations.

- `ArticleStateService`, `FeedIngestionService`, `SyncOrchestratorService`,
  `SelectorPreviewService`, `OpmlImportExportService`, `JsonSelectorService`.
- **Command pattern** for user actions: mark read, tag, refresh, delete feed —
  each a discrete operation, which keeps the door open for an undo stack or
  action log later.
- **Observer pattern** via RxJS (`Observable`/`Subject`/signals) for
  cross-component state — unread counts, sync status — computed from
  repositories rather than duplicated across stores.

### 2.3 Infrastructure (`src/app/infrastructure`)

Implements every Domain interface. Nothing here is imported by Domain. This
layer is deliberately thin now — a single HTTP-backed implementation per
interface, no platform branching.

- `IndexedDbArticleRepository`, `IndexedDbStateRepository`,
  `IndexedDbFeedRepository`, `IndexedDbFolderRepository`,
  `IndexedDbSelectorConfigRepository` — local cache/offline queue.
- `HttpSyncProvider` — implements `SyncProvider` against the backend's
  `/api/sync` endpoint (see §5).
- `HttpFeedFetcher` — implements `FeedFetcher` against `/api/feeds/fetch`
  (see §6).
- `HttpSelectorEvaluator` — implements `SelectorEvaluator` against
  `/api/selectors/evaluate`.
- `RssAtomParser` — still runs client-side on the XML text the backend
  returns (no reason to move this server-side; it's not a CORS or sandboxing
  concern).

### 2.4 Presentation (`src/app/presentation` or feature folders)

Standard Angular smart/dumb component split (MVVM-style):

- Feed tree, article list, article detail, selector editor, sync status,
  import/export dialogs.
- Each feature has a thin view-model service (or signal-based state) that
  talks only to Application services — never directly to Infrastructure.

## 3. Design patterns — where they live

| Pattern | Used for | Location |
|---|---|---|
| Repository | Persistence abstraction | Domain interfaces / Infrastructure implementations |
| Strategy | Feed ingestion (RSS vs. selector) | Infrastructure |
| Adapter | HTTP-backed sync, fetch, and selector evaluation | Infrastructure |
| Factory | Parser creation, selector creation | Infrastructure |
| Observer | State updates, sync status, unread counts | Application (RxJS) |
| Command | Mark read, tag, refresh, delete feed | Application |
| MVVM | Component/service separation | Presentation |

Note: the client no longer needs a *fetch-adapter* or *sync-provider*
Strategy/Factory (picking an implementation by browser). That branching
existed only to route around platform gaps that the backend now removes
entirely — one `HttpSyncProvider` and one `HttpFeedFetcher` serve every
browser and device identically.

## 4. Project structure

```
reader/
├── frontend/
│   └── src/app/
│       ├── domain/
│       │   ├── models/
│       │   ├── repositories/           # interfaces only
│       │   ├── adapters/                # interfaces only (FeedFetcher, SyncProvider, SelectorEvaluator)
│       │   └── services/                # dedupe, merge, pruning rules
│       ├── application/
│       │   ├── article-state.service.ts
│       │   ├── feed-ingestion.service.ts
│       │   ├── sync-orchestrator.service.ts
│       │   ├── selector-preview.service.ts
│       │   ├── opml-import-export.service.ts
│       │   └── json-selector.service.ts
│       ├── infrastructure/
│       │   ├── persistence/
│       │   │   ├── indexeddb-article.repository.ts
│       │   │   ├── indexeddb-state.repository.ts
│       │   │   ├── indexeddb-feed.repository.ts
│       │   │   ├── indexeddb-folder.repository.ts
│       │   │   └── indexeddb-selector-config.repository.ts
│       │   ├── sync/
│       │   │   └── http-sync.provider.ts
│       │   ├── fetch/
│       │   │   └── http-feed.fetcher.ts
│       │   └── parsing/
│       │       ├── rss-atom.parser.ts
│       │       └── http-selector.evaluator.ts
│       └── presentation/
│           ├── feed-tree/
│           ├── article-list/
│           ├── article-detail/
│           ├── selector-editor/
│           ├── sync-status/
│           └── import-export/
└── backend/
    ├── ReaderApi.Functions/
    │   ├── SyncFunctions.cs
    │   ├── FeedFetchFunctions.cs
    │   ├── SelectorFunctions.cs
    │   ├── PruneFunctions.cs
    │   ├── Dtos/
    │   └── Program.cs
    └── ReaderApi.Functions.Tests/
```

## 5. Backend

### 5.1 Hosting model

Azure Functions, .NET isolated worker, Consumption (scale-to-zero) plan. No
server to keep running — the app stays reachable from any device without
depending on a local machine's uptime, at a cost that sits inside Azure's
free monthly grants for a single-user app at this scale.

### 5.2 Sync endpoint

`GET /api/sync` / `PUT /api/sync` against a single blob,
`sync-data/sync-document.json`, in Azure Blob Storage. Blob ETags provide
free optimistic concurrency: `PUT` sends `If-Match` with the ETag from the
last `GET`, so a genuine concurrent write is rejected rather than silently
overwritten, even though the odds of that happening are treated as low.
`HttpSyncProvider` (client) surfaces a conflict as a retryable error; the
`SyncOrchestratorService` re-fetches and re-applies the change.

### 5.3 Feed fetch endpoint

`POST /api/feeds/fetch` takes a URL, fetches it server-to-server (where CORS
does not apply at all), and returns the raw RSS/Atom XML text. This fully
replaces the CORS-proxy, browser-extension-bridge, and per-browser
fetch-adapter machinery from the browser-only design — there is exactly one
fetch path, and it works the same for every device.

### 5.4 Selector evaluation endpoint

`POST /api/selectors/evaluate` takes a URL and a `SelectorConfig`, fetches
the page server-side, and runs the extraction with AngleSharp — a real HTML
parser with no script execution capability at all, so there is no sandboxing
concern on the extraction path (there never really was much of one, but this
removes it as a design question entirely). Returns matched article data as
JSON. The interactive WYSIWYG selector *editor* UI still renders a preview
client-side for the user to visually pick elements; that preview continues
to use a sandboxed `<iframe>` (`sandbox="allow-same-origin"`, no
`allow-scripts`) purely for the visual editing experience, not for
extraction safety.

### 5.5 Tombstone pruning

A Timer-triggered Function (`PruneTombstones`, daily) reads the sync
document, drops any folder/feed tombstone older than
`UserSettings.TombstoneRetentionDays` (default 30), and writes the document
back. This replaces the client-triggered pruning from the browser-only
design with a server-side scheduled job — simpler, since it runs once
centrally rather than being triggered opportunistically by whichever device
happens to sync next.

### 5.6 Auth

Function-level keys (`x-functions-key`), issued per function app. Adequate
for a single-user tool; no user database or OAuth flow needed. The key is
stored in client-side app config, not committed to source.

### 5.7 Local development

Azure Functions Core Tools + Azurite (local Blob Storage emulator) for a
full local dev loop with no real Azure resource required until deployment.

## 6. Sync architecture

### 6.1 Provider

Single `HttpSyncProvider`, implementing `SyncProvider` against `/api/sync`.
No platform branching — every browser and device uses the same
implementation.

### 6.2 Offline behavior

State changes (mark read, tag, delete feed, etc.) always write to IndexedDB
first and are queued for sync. If the backend is unreachable — including the
"my machine is off" case if ever self-hosting locally instead of using
Functions — the queue simply grows and flushes on the next successful
`PUT /api/sync`. This was true even in the browser-only design and needs no
change here.

### 6.3 Conflict resolution

Document-level last-write-wins on `SyncDocument.updatedAt`, backstopped by
the blob ETag conditional write (§5.2) rather than relying purely on
timestamp comparison. No field-level merge.

### 6.4 Tombstones

Handled server-side by the scheduled pruning Function (§5.5); the client's
domain-level pruning rule exists mainly so the same logic can be reasoned
about and tested independent of where it runs.

## 7. Fetch architecture

Single `HttpFeedFetcher`, implementing `FeedFetcher` against
`/api/feeds/fetch`. `RssAtomParser` still runs client-side against the
returned XML text — parsing plain XML client-side was never a CORS or
security concern, only *retrieving* the feed was.

The `FeedFetcher` interface remains the extension point envisioned in the
original spec — a future alternative fetch implementation (e.g. one with
retry/backoff tuning, or one hitting a different backend) can be substituted
with no change to parsing, ingestion, or storage.

## 8. Why the browser-only design was abandoned

For the record, since this was a substantial pivot: the original design
assumed a user-configurable folder, synced externally, accessed via the File
System Access API (Chromium/Safari desktop) or a Firefox extension bridge
into `browser.storage.sync`. Checking current browser support surfaced a
hard blocker — the File System Access API's disk-picker methods
(`showOpenFilePicker`, `showSaveFilePicker`, `showDirectoryPicker`) are
supported only on Chromium desktop browsers. Safari does not support them on
macOS, iPadOS, or iOS in any version — only OPFS, which is origin-private and
invisible to external sync tools. Chrome for Android, Samsung Internet, and
every other mobile browser expose only OPFS as well. Since the app needs to
run on both desktop and mobile, folder-based sync could not have delivered
mobile support at all, regardless of how the Firefox-specific gap was
handled. A thin backend was the more direct fix — mobile and desktop reach
it identically over HTTPS, and it happens to remove the Firefox-specific
`storage.sync` chunking problem and the CORS-adapter branching as a side
effect.

## 9. Security architecture

### 9.1 CSP

Delivered via `<meta http-equiv="Content-Security-Policy">` in `index.html`,
for identical behavior on desktop and mobile with no server-rendering
step. With fetch and selector evaluation now server-side, the client's
`connect-src` only needs to allow the app's own backend origin — no more
allowing arbitrary user-configured proxy origins. `frame-ancestors` and
`sandbox` are still not enforceable via meta tag; the selector-preview
iframe's own `sandbox` attribute (§5.4) is what actually isolates it.

### 9.2 Backend attack surface

The backend does introduce a (small) server-side attack surface that didn't
exist in the browser-only design: the fetch-proxy endpoint accepts a
user-supplied URL. Validate/allow-list this at the Function level (reject
non-http(s) schemes, disallow requests to private/internal IP ranges to
avoid SSRF against the hosting environment) even though the app is
single-user — the Function is still a publicly reachable endpoint.

### 9.3 Data safety

The sync blob and local IndexedDB cache remain the sensitive data surfaces.
Function keys gate access to the backend; least-privilege access on the
storage account (the Function's managed identity or connection string scoped
to just the one container) is worth setting up even for a single-user app.

## 10. Decisions log

| # | Question | Resolution |
|---|---|---|
| 1 | OPFS vs. File System Access API | Superseded — see #8 below |
| 2 | Field-level merge vs. document LWW | Document-level LWW; no field-level merge (still holds) |
| 3 | Firefox file access | Superseded — see #8 below |
| 4 | Sandbox scope | Selector *extraction* moved server-side (AngleSharp, no sandbox needed); iframe sandbox retained only for the interactive preview UI |
| 5 | Tombstone growth | Configurable retention (`TombstoneRetentionDays`, default 30), pruned by a daily server-side Timer Function |
| 6 | External file edit collisions | Superseded — blob ETag conditional writes now provide real optimistic concurrency at low cost |
| 7 | CSP delivery | Meta-tag CSP retained; `connect-src` surface shrinks since fetch/selector calls now target only the app's own backend |
| 8 | Desktop + mobile support | File System Access API confirmed desktop-Chromium-only (no Safari at all, no mobile at all) — browser-only folder sync abandoned in favor of a thin, self-hosted backend reachable identically from every device |
| 9 | Backend must not require an always-on local machine | Azure Functions Consumption plan (scale-to-zero) + Blob Storage — reachable regardless of any personal machine's uptime, cost expected within Azure's free grants at this scale |

## 11. Open follow-ups

- Allow-list / SSRF guard details for the fetch-proxy endpoint (§9.2).
- Whether to add a lightweight retry/backoff policy in `HttpFeedFetcher` for
  transient Function cold-starts on the Consumption plan.
- Whether to layer real HTTP response headers on top of meta-tag CSP if
  useful (defense-in-depth, not required).
