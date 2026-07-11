# Local News Aggregator Specification (revised)

This specification reflects the finalized design: a local-first Angular PWA
client backed by a small, self-hosted serverless backend; one authoritative
sync document; feed-state sync including deleted feeds; sandboxed HTML
preview without scripts for the selector *editor* UI; server-side selector
extraction; link-based deduplication; no tag auditing; no stored selector
outputs; and metadata-only article storage. See the companion
`architecture.md` for layers, patterns, folder structure, and backend
details.

## 1. Scope

The application is a responsive Angular PWA client for desktop and mobile,
backed by a small self-hosted backend. It aggregates RSS/Atom feeds and
custom selector-based feeds, supports read/unread and read-later state,
applies tags, and synchronizes state across devices via the backend.

The architecture remains extensible so a future fetch implementation (e.g.
different retry/backoff behavior, or a different hosting target) can be
introduced without changing the domain model, UI flow, or storage model.

**Key architectural point:** feed fetching and selector-based scraping
happen server-side, in a small backend the user self-hosts. This sidesteps
browser CORS restrictions entirely (server-to-server requests aren't subject
to CORS) and — as important — is what makes the app work identically on
desktop and mobile: the browser-only alternative (a user-configurable,
externally-synced folder via the File System Access API) turned out to be
supported only on Chromium desktop browsers, with no support on Safari
(desktop or iOS) or any mobile browser at all. See §11 for the full
reasoning.

## 2. Design goals

- **Local-first client logic** — all UI-facing processing and offline
  browsing remain in the client; the backend is authoritative only for the
  sync document and for the two operations (feed fetch, selector evaluation)
  that need to happen off-device.
- **Reachable without depending on a personal machine's uptime** — the
  backend runs on a scale-to-zero serverless platform (Azure Functions),
  not a machine the user has to keep running.
- **Metadata-only storage** — store only metadata and a summary/description
  snippet, so offline context is available without bloating the sync
  document. No article body content is stored — the title link opens the
  source article in a new tab.
- **Hardened security** — Angular's default sanitization plus OWASP-style
  hardening on the client, and input validation / SSRF guarding on the
  backend's fetch-proxy endpoint (see §4).

## 3. Architecture

Layered architecture on the client: Presentation → Application → Domain ←
Infrastructure. Domain has no dependency on Angular, the browser, or any
storage/fetch/backend mechanism; Infrastructure implements the interfaces
Domain defines, now as thin HTTP-backed adapters talking to the backend.

- **Infrastructure layer** — IndexedDB (local cache/offline queue), and
  HTTP-backed implementations of sync, feed fetch, and selector evaluation.
- **Backend** — Azure Functions (.NET isolated worker), providing
  `/api/sync`, `/api/feeds/fetch`, `/api/selectors/evaluate`, and a
  scheduled tombstone-pruning job.

### Patterns used

- Repository — persistence (client-side IndexedDB).
- Adapter — HTTP-backed sync, fetch, and selector evaluation.
- Factory — parser creation.
- Observer — state updates and UI notifications.
- Command — user actions (mark read, tag, refresh, delete feed).
- MVVM-style component/service separation in Angular.

Note: the client no longer needs Strategy implementations chosen by browser
type. That branching existed only to route around platform-specific gaps
(File System Access API support, CORS) that the backend removes by serving
every device identically.

## 4. Security

### Input handling

All inputs are validated with allow-lists where possible: feed URLs, folder
names, tags, selector strings, refresh intervals. The backend additionally
validates URLs passed to the fetch-proxy and selector-evaluation endpoints —
rejecting non-http(s) schemes and requests targeting private/internal IP
ranges — since these are publicly reachable endpoints even in a single-user
deployment.

### HTML handling

Any HTML used for preview or extracted content is treated as untrusted.
Selector *extraction* (during refresh) happens server-side using AngleSharp,
a real HTML parser with no script execution capability — there is no
sandboxing concern on this path. The interactive selector *editor* preview
UI still renders in a sandboxed `<iframe>` (`sandbox="allow-same-origin"`,
no `allow-scripts`) client-side, purely to give the user a safe visual
picking experience — not because extraction itself is unsafe.

### CSP

Delivered via `<meta http-equiv="Content-Security-Policy">` in `index.html`,
for identical behavior on desktop and mobile with no server-rendering step.
`connect-src` needs to allow only the app's own backend origin — there are
no more user-configured proxy origins to account for. `frame-ancestors` and
`sandbox` remain unenforceable via meta tag; the selector-preview iframe's
own `sandbox` attribute is what actually isolates it.

### Backend attack surface

The fetch-proxy and selector-evaluation endpoints accept user-supplied URLs
and are publicly reachable, so they're validated and allow-listed as above
even though the app itself is single-user. Function-level keys
(`x-functions-key`) gate access to all endpoints; no user database or OAuth
flow is needed for a single-user tool.

## 5. Functional behavior

### Feeds

- RSS feeds.
- Atom feeds.
- Selector-based custom feeds.

Custom feeds prioritize extracting data from structured data (JSON-LD,
Microdata, Open Graph tags) before falling back to CSS selectors. Extraction
runs server-side (§4).

### Sync

Sync includes: all feeds, deleted feeds (as tombstones), folders, selector
configurations, article state, and user settings — stored in a single JSON
sync document held in Azure Blob Storage.

**Conflict resolution** is document-level last-write-wins based on
`updatedAt`, backstopped by a blob ETag conditional write (the client sends
`If-Match` on save, so a genuine concurrent write is rejected rather than
silently lost) — the chance of true simultaneous writes is still treated as
low, but the ETag check is nearly free insurance. Tags do not require audit
history.

**Tombstones** for deleted feeds/folders are retained for a configurable
number of days (`UserSettings.tombstoneRetentionDays`, default 30) and then
permanently dropped by a daily scheduled backend job, so the sync document
does not grow without bound.

### Articles

Article records store metadata only:

- feed item ID,
- canonical link,
- title,
- summary,
- image URL,
- date/time,
- feed ID,
- tags (via separate state),
- read/read-later flags.

No article body content is stored — clicking the title opens the source
article in a separate tab.

### Deduplication

A normalized link (tracking parameters such as `utm_source` stripped) is used
as the article ID. If a collision occurs, a composite ID (normalized link +
published date) is used instead.

### Selector feedback

Selector editing supports:

- multiple selectors per field,
- quick preview of selector output (sandboxed client-side iframe for the
  visual picking experience; actual production extraction runs server-side),
- visible count of matches,
- visual feedback for broken selectors,
- versioning of selector configurations.

### Refresh

- Manual refresh available at all times.
- Automatic refresh on app reload, for the active folder/category only.
- Automatic refresh when switching folders/categories.
- Configurable global interval.
- Staggered updates to avoid excessive load on the backend.

### Offline use

The app continues to display cached metadata and allow state editing while
offline. Changes queue locally (IndexedDB) and sync when the backend becomes
reachable again — this holds whether the backend is briefly unreachable due
to network conditions or, in a self-hosted local-server scenario, the host
machine being off.

## 6. Storage model

### Client (IndexedDB)

Used for: feed definitions, deleted-feed tombstones, folder definitions,
article metadata, article state, selector configurations, selector versions,
refresh timestamps, sync queue, user preferences — all as a local
cache/offline queue in front of the backend.

### Backend (Azure Blob Storage)

One JSON blob (`sync-data/sync-document.json`) containing the complete
authoritative application state, including tombstones for deleted
feeds/folders so deletions replicate across devices.

### State reconciliation

Document-level last-write-wins based on `updatedAt`, with blob ETag
conditional writes as a concurrency backstop. No field-level merge — a
single active writer at a time is still the assumption, just verified
cheaply rather than assumed blindly.

## 7. Feed ingestion

### RSS and Atom

The backend fetches feed URLs server-to-server (`/api/feeds/fetch`), where
CORS does not apply, and returns the raw XML text. The client parses that
text with a standard browser-compatible RSS/Atom parser — parsing plain XML
client-side was never the problem; only retrieving it across origins was.

### Selector feeds

- The backend fetches the target page and runs extraction
  (`/api/selectors/evaluate`) using AngleSharp against the configured
  selectors, prioritizing structured data (JSON-LD, Microdata, Open Graph)
  before falling back to CSS selectors.
- The client renders a sandboxed, scriptless preview purely for interactive
  selector editing.
- Results normalize to metadata-only article records.
- Selector test runs remain internal and transient — not persisted.

### Future extensibility

The `FeedFetcher` and `SelectorEvaluator` interfaces are the extension
points — an alternative implementation (different backend, different
retry/backoff policy) can be substituted with no change to parsing,
ingestion, or storage.

## 8. OPML and custom JSON

### OPML

Strict OPML for feed subscriptions only, preserving standard semantics
including folder nesting and feed URLs.

### Custom JSON

Custom JSON for selector feeds, selector versions, and any extraction rules
that don't belong in strict OPML — preserving interoperability while
avoiding misuse of the OPML format.

## 9. Angular guidance

### Component design

Small, focused components: feed tree, article list, article details,
selector editor, sync status, import/export dialogs.

### Service design

Injectable services for: local storage, ingestion, sync, preview sandbox,
OPML import/export, selector versioning.

### State flow

Unidirectional state flow. Derived data (unread counts, tag filters) is
computed from repositories rather than duplicated across stores.

### Security in Angular

Angular bindings and sanitization by default. No direct DOM manipulation
outside the tightly controlled sandbox preview component. Never pass
untrusted values into a bypass-security API.

## 10. Fixed design decisions

- Sync state lives in one authoritative JSON document, held server-side in
  Blob Storage, cached client-side in IndexedDB.
- Feed fetching and selector extraction happen server-side, removing CORS
  and sandboxing as client-side concerns for those operations.
- The backend runs on a scale-to-zero serverless platform, so availability
  does not depend on any personal machine staying on.
- Sync state includes all feeds and deleted feeds (tombstoned, pruned after
  a configurable retention period by a scheduled backend job).
- The selector-editor preview excludes scripts, enforced via iframe
  `sandbox`, not CSP.
- Deduplication uses link identity, with a composite fallback.
- Tags do not require audit history.
- Selector output is not persisted.
- Article content is not stored; only metadata is stored.
- Conflict resolution is document-level last-write-wins, backstopped by blob
  ETag conditional writes; no field-level merge.

## 11. Why the browser-only design was abandoned

The original design assumed a user-configurable folder, synced externally by
the user's own system, accessed via the File System Access API — with a
Firefox-specific companion extension bridging into `browser.storage.sync`
for the browsers that lacked it. Checking current browser support surfaced a
hard blocker: the File System Access API's disk-picker methods
(`showOpenFilePicker`, `showSaveFilePicker`, `showDirectoryPicker`) are
supported only on Chromium desktop browsers. Safari does not support them on
macOS, iPadOS, or iOS in any version — only the Origin Private File System,
which is invisible to external sync tools. Every mobile browser, including
Chrome for Android and Samsung Internet, exposes only OPFS as well. Since
desktop-and-mobile support was a hard requirement, folder-based sync could
not have delivered mobile support regardless of how the Firefox gap was
handled — so the design moved to a thin, self-hosted backend that every
device reaches identically over HTTPS, which happens to remove the CORS and
sandboxing workarounds as a side effect too.

## 12. Implementation risks

- The fetch-proxy and selector-evaluation endpoints accept user-supplied
  URLs and need allow-listing / SSRF guarding even in a single-user
  deployment, since they're publicly reachable.
- Some sources may still be awkward to fetch or parse even server-side
  (unusual auth requirements, aggressive bot-blocking).
- Selector-based extraction is only as stable as the source site's HTML.
- Meta-tag CSP cannot enforce `frame-ancestors` or `sandbox` — iframe
  isolation for the selector-editor preview relies on the iframe's own
  `sandbox` attribute.
- Consumption-plan Functions can cold-start; a brief added latency on the
  first request after idle is expected and should be tolerated gracefully
  by the client (retry, not error).

## 13. MVP

- RSS and Atom feed import and refresh via the backend fetch proxy.
- OPML import/export.
- Custom JSON import/export for selector feeds.
- Backend-hosted single-document sync (Azure Functions + Blob Storage).
- Read/read-later/tags.
- Folder/category navigation.
- Sandbox-based WYSIWYG selector editor (client), server-side selector
  evaluation (backend).
- Link-based deduplication.
- Offline browsing of cached metadata.
- Refresh on reload and category switch.

## Appendix A: Angular models

```ts
export type FeedType = 'rss' | 'atom' | 'selector';

export interface FolderDefinition {
  id: string;
  name: string;
  order: number;
  parentId?: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface FeedDefinition {
  id: string;
  type: FeedType;
  title: string;
  folderId?: string;
  xmlUrl?: string;
  htmlUrl?: string;
  pageUrl?: string;
  enabled: boolean;
  defaultTags: string[];
  selectorConfigId?: string;
  selectorConfigVersion?: number;
  lastRefreshAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SelectorConfig {
  id: string;
  version: number;
  itemSelectors: string[];
  titleSelectors: string[];
  summarySelectors: string[];
  imageSelectors: string[];
  urlSelectors: string[];
  dateSelectors: string[];
  notes?: string;
  updatedAt: string;
}

export interface ArticleItem {
  id: string;
  feedId: string;
  canonicalUrl: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  publishedAt?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleState {
  articleId: string;
  read: boolean;
  readLater: boolean;
  tags: string[];
  updatedAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  refreshIntervalMinutes: number;
  staggerMs: number;
  defaultView: 'all' | 'unread' | 'readLater';
  lastActiveFolderId?: string;
  autoRefreshOnFolderSwitch: boolean;
  tombstoneRetentionDays: number;
}

export interface SyncDocument {
  schemaVersion: number;
  updatedAt: string;
  folders: FolderDefinition[];
  feeds: FeedDefinition[];
  selectorConfigs: SelectorConfig[];
  articleStates: ArticleState[];
  settings: UserSettings;
}
```

## Appendix B: Angular interfaces

```ts
export interface FeedFetcher {
  fetchText(url: string): Promise<string>;
}

export interface FeedParser<TItem> {
  parse(input: string): Promise<TItem[]>;
}

export interface SelectorEvaluator {
  evaluate(url: string, config: SelectorConfig): Promise<SelectorTestResult>;
}

export interface IngestionStrategy {
  refresh(feed: FeedDefinition): Promise<ArticleItem[]>;
}

export interface SyncProvider {
  load(): Promise<{ document: SyncDocument | null; etag?: string }>;
  save(document: SyncDocument, etag?: string): Promise<{ etag: string }>;
}

export interface ArticleRepository {
  upsertMany(items: ArticleItem[]): Promise<void>;
  getByFeedId(feedId: string): Promise<ArticleItem[]>;
  findByCanonicalUrl(url: string): Promise<ArticleItem | null>;
}

export interface StateRepository {
  upsert(state: ArticleState): Promise<void>;
  getByArticleId(articleId: string): Promise<ArticleState | null>;
}

export interface SelectorPreviewService {
  render(url: string): Promise<void>; // sandboxed iframe, editor UI only
  evaluate(config: SelectorConfig): Promise<SelectorTestResult>; // delegates to backend
}

export interface SelectorTestResult {
  matchedCount: number;
  sampleTitle?: string;
  sampleSummary?: string;
  sampleImageUrl?: string;
  sampleUrl?: string;
  sampleDate?: string;
  warnings: string[];
}

export interface OpmlService {
  import(xml: string): Promise<FeedDefinition[]>;
  export(feeds: FeedDefinition[]): string;
}

export interface JsonSelectorService {
  import(json: string): Promise<SelectorConfig[]>;
  export(configs: SelectorConfig[]): string;
}
```

## Appendix C: Angular service sketch

```ts
@Injectable({ providedIn: 'root' })
export class ArticleStateService {
  constructor(
    private repo: StateRepository,
    private sync: SyncService
  ) {}

  async toggleRead(articleId: string): Promise<void> {
    const current = await this.repo.getByArticleId(articleId);
    const next: ArticleState = {
      articleId,
      read: !(current?.read ?? false),
      readLater: current?.readLater ?? false,
      tags: current?.tags ?? [],
      updatedAt: new Date().toISOString()
    };
    await this.repo.upsert(next);
    this.sync.queueImmediate();
  }
}
```

## Appendix D: Backend function sketch (C#, .NET isolated worker)

```csharp
[Function("GetSync")]
public async Task<HttpResponseData> Get(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "sync")] HttpRequestData req)
{
    var blob = _container.GetBlobClient("sync-document.json");
    if (!await blob.ExistsAsync()) return req.CreateResponse(HttpStatusCode.NoContent);

    var download = await blob.DownloadContentAsync();
    var res = req.CreateResponse(HttpStatusCode.OK);
    res.Headers.Add("ETag", download.Value.Details.ETag.ToString());
    await res.WriteStringAsync(download.Value.Content.ToString());
    return res;
}

[Function("PutSync")]
public async Task<HttpResponseData> Put(
    [HttpTrigger(AuthorizationLevel.Function, "put", Route = "sync")] HttpRequestData req)
{
    var body = await new StreamReader(req.Body).ReadToEndAsync();
    var ifMatch = req.Headers.TryGetValues("If-Match", out var v) ? v.First() : null;

    var blob = _container.GetBlobClient("sync-document.json");
    var options = ifMatch is null
        ? new BlobUploadOptions()
        : new BlobUploadOptions { Conditions = new BlobRequestConditions { IfMatch = new ETag(ifMatch) } };

    await blob.UploadAsync(BinaryData.FromString(body), options);
    return req.CreateResponse(HttpStatusCode.NoContent);
}

[Function("FetchFeed")]
public async Task<HttpResponseData> Fetch(
    [HttpTrigger(AuthorizationLevel.Function, "post", Route = "feeds/fetch")] HttpRequestData req)
{
    var request = await req.ReadFromJsonAsync<FetchRequest>();
    var text = await _httpClient.GetStringAsync(request!.Url);
    var res = req.CreateResponse(HttpStatusCode.OK);
    await res.WriteStringAsync(text);
    return res;
}

[Function("EvaluateSelector")]
public async Task<HttpResponseData> Evaluate(
    [HttpTrigger(AuthorizationLevel.Function, "post", Route = "selectors/evaluate")] HttpRequestData req)
{
    var request = await req.ReadFromJsonAsync<SelectorEvalRequest>();
    var html = await _httpClient.GetStringAsync(request!.Url);

    var context = BrowsingContext.New(Configuration.Default);
    var doc = await context.OpenAsync(r => r.Content(html));

    var items = doc.QuerySelectorAll(string.Join(",", request.Config.ItemSelectors))
        .Select(el => new ArticleItemDto
        {
            Title = el.QuerySelector(string.Join(",", request.Config.TitleSelectors))?.TextContent,
            Summary = el.QuerySelector(string.Join(",", request.Config.SummarySelectors))?.TextContent,
            ImageUrl = el.QuerySelector(string.Join(",", request.Config.ImageSelectors))?.GetAttribute("src"),
            Url = el.QuerySelector(string.Join(",", request.Config.UrlSelectors))?.GetAttribute("href"),
        })
        .ToList();

    var res = req.CreateResponse(HttpStatusCode.OK);
    await res.WriteAsJsonAsync(items);
    return res;
}

[Function("PruneTombstones")]
public async Task Prune([TimerTrigger("0 0 3 * * *")] TimerInfo timer)
{
    var blob = _container.GetBlobClient("sync-document.json");
    if (!await blob.ExistsAsync()) return;

    var doc = JsonSerializer.Deserialize<SyncDocument>((await blob.DownloadContentAsync()).Value.Content);
    var cutoff = DateTimeOffset.UtcNow.AddDays(-doc!.Settings.TombstoneRetentionDays);

    doc.Folders = doc.Folders.Where(f => f.DeletedAt is null || f.DeletedAt > cutoff).ToList();
    doc.Feeds = doc.Feeds.Where(f => f.DeletedAt is null || f.DeletedAt > cutoff).ToList();

    await blob.UploadAsync(BinaryData.FromString(JsonSerializer.Serialize(doc)), overwrite: true);
}
```

The design remains extensible for future fetch or hosting changes, but the
current version is intentionally built around server-side fetch and
extraction, and a serverless backend the user self-hosts without needing to
keep a machine running. It honors Angular's security model, OWASP
principles, and clean architecture boundaries while keeping the
implementation practical on both desktop and mobile.
