# RSS Reader Application Specification — Privacy-Focused Hybrid Edition

## Overview

Build a self-hosted, local-first RSS aggregator web application with Angular/TypeScript that mimics core InoReader functionality. This variant prioritizes privacy and cross-device synchronization without requiring a central server. All data resides locally, with metadata synced via cloud storage (OneDrive/Dropbox/Google Drive) between installations.

## Technology Stack
Layer|Technology|Version Notes
-----|-----------|-------------
Frontend Framework | Angular 18+ | Latest stable
Language | TypeScript 5.x | Strict | mode enabled
State Management | Signals Services | Reactive state, no RxJS overhead
UI Component Library | Material Design Components OR Tailwind + Headless UI | Optional theming flexibility
HTTP Client | Angular HttpClient | For external feed fetches only
Build Tool | Vite (ng serve) | Fast HMR and dev experience
Testing | Jasmine + Karma | Unit tests; Cypress for E2E
Local Database | SQLite 3 | File-based, sync-compatible
ORM | TypeORM or Prisma (SQLite driver) | Typed query interfaces
Sync Service | Custom background worker | Handles OneDrive reconciliation
Containerization | Docker Compose (optional) | Local development convenience
Article Cache | Encrypted filesystem storage | Per-article HTML/text blobs


# Core Features (Phase 1 — MVP)

## Feed Management

✅ Subscribe via RSS URL (direct fetch from browser/backend worker)
✅ Import OPML file (bulk subscription migration)
✅ Delete/unsubscribe from feeds
✅ Fetch full article text from non-RSS pages (local scraper engine)
✅ Manual categorization of extracted feeds
✅ Cached raw RSS preserved locally (JSONB backup)

## Organization

✅ Folder/group hierarchy support (nested directories in local DB)
✅ Tags applied to individual articles (stored in SQLite)
✅ Starred/bookmarked articles collection (synced metadata)
✅ Unread/read status per article (**this is what syncs across devices**)

## Article Display

✅ Card/List view toggle
✅ Sortable columns (date, source, title alphabetically)
✅ Pagination/infinite scroll for large lists
✅ Featured image thumbnail extraction when available
✅ Metadata display: publish_date, source_domain, read_time_estimate
✅ Summary/snippet beneath headline
✅ Click headline → opens original article in new tab/window
✅ Offline article cache (HTML stored locally on each device)

## Search & Filtering

✅ Full-text search across article content (SQLite FTS5 extension)
✅ Filter by folder, tag, date range, starred status
✅ Quick filter input at top of feed list
✅ Cross-device state awareness (see which articles you marked read on other devices)

## Extended Features (Phase 2+)

🔮 Rules/Automation engine: auto-tag/filter/archive based on keyword patterns
🔮 Offline reading mode (service worker PWA caching)
🔮 Export archives to JSON/PDF/ePub formats
🔮 Integration hooks for Pocket, Notion, Evernote (webhook-triggered)
🔮 Text-to-speech audio playback of articles
🔮 Dark/light theme system
🔮 Multi-user profiles within same installation
🔮 Keyboard shortcuts for navigation efficiency
🔮 Drag-and-drop reordering within folders
🔮 Feed health monitoring (dead link detection)
🔮 Duplicate article deduplication across sources
🔮 Keyword alert subscriptions (email/notification triggers optional)
🔮 Analytics dashboard showing reading time/topics breakdown
🔮 End-to-end encryption option for sensitive folders/categories

Architecture Diagram (Hybrid Model)
```
┌─────────────────────────────────────────────────────────────┐
│                  Installation A (Laptop)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Angular SPA                         │  │
│  │                                                       │  │
│  │           ▲             SQLite            ▲          │  │
│  │    State ←──────────► Metadata ←─────────► UI        │  │
│  │                       (file.db)                       │  │
│  │                                                       │  │
│  │  ┌─────────────┐     ┌─────────────┐                 │  │
│  │  │   Article   │     │   Sync      │                 │  │
│  │  │   Cache     │◄───►│   Worker    │                 │  │
│  │  │ (files/fs)  │     │(reconciler) │                 │  │
│  │  └─────────────┘     └──────┬──────┘                 │  │
│  └──────────────────────────────┼───────────────────────┘  │
└─────────────────────────────────┼──────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloud Storage (OneDrive/Dropbox)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  file.db         ────────────┐                        │  │
│  │  articles_cache/ ────────────┤  SYNCED FILES          │  │
│  │  settings.json   ────────────┘                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────▲──────────────────────────┘
                                  │
┌─────────────────────────────────┼──────────────────────────┐
│                  Installation B (Desktop)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Angular SPA                         │  │
│  │                                                       │  │
│  │           ▲             SQLite            ▲          │  │
│  │    State ←──────────► Metadata ←─────────► UI        │  │
│  │                       (file.db)                       │  │
│  │                                                       │  │
│  │  ┌─────────────┐     ┌─────────────┐                 │  │
│  │  │   Article   │     │   Sync      │                 │  │
│  │  │   Cache     │◄───►│   Worker    │                 │  │
│  │  │ (files/fs)  │     │(reconciler) │                 │  │
│  │  └─────────────┘     └─────────────┘                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

Note: Each installation maintains its own FULL copy. Cloud storage acts as sync conduit only for metadata, not entire databases simultaneously accessed.

## Local-First Design Principles

**CRITICAL: Data flow priority**
1. UI reads from LOCAL SQLite exclusively (zero network latency)
2. Background sync polls for changes every N seconds/minutes
3. Conflicts resolved automatically (last-write-wins heuristic)
4. Article caching happens per-device (no cloud transfer needed for content)
5. User never waits for sync to complete before viewing content

## Database Schema (SQLite)

```sql
-- Device profile (each installation gets unique ID)
CREATE TABLE users (
  id TEXT PRIMARY KEY,        -- UUID generated on first install
  device_name TEXT NOT NULL,
  email_hint TEXT,            -- Optional login identity (not authenticated)
  last_sync_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, device_name) VALUES (gen_random_uuid(), 'My-Laptop');

-- Folder/hierarchy organization (local-only structure)
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  parent_folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name, parent_folder_id)
);

-- Subscription feeds
CREATE TABLE feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  url TEXT NOT NULL,
  display_name VARCHAR(200),
  folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  favicon_url TEXT,
  favicon_cache_path TEXT,   -- Local path to cached .ico/.png
  last_fetched_at DATETIME,
  fetch_error_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, url)
);

-- Individual articles/items
CREATE TABLE articles (
  guid TEXT PRIMARY KEY,      -- Stable hash or <guid> element value
  feed_id INTEGER REFERENCES feeds(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  published_at DATETIME NOT NULL,
  updated_at DATETIME,
  author VARCHAR(200),
  summary TEXT,
  content_html TEXT,          -- Cached full article content
  content_cache_path TEXT,    -- Alternative: path to file blob
  featured_image_url TEXT,
  featured_image_cache_path TEXT,
  external_link_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- READ/STAR states (this metadata syncs across devices!)
-- Composite key prevents duplicate entries
CREATE TABLE article_states (
  guid TEXT NOT NULL,
  user_device_id TEXT NOT NULL,  -- Which device made this change
  is_read BOOLEAN DEFAULT 0,
  is_starred BOOLEAN DEFAULT 0,
  folder_assignments TEXT,       -- JSON array of folder IDs
  tag_assignments TEXT,          -- JSON array of tag IDs
  notes TEXT,                    -- Personal annotations
  last_changed_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
  primary_key(guid, user_device_id)
);

CREATE INDEX idx_state_guid ON article_states(guid);
CREATE INDEX idx_state_user ON article_states(user_device_id, is_read DESC);

-- Tags (defined per-installation, names sync to establish common taxonomy)
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  name VARCHAR(50) UNIQUE NOT NULL,
  color_hex VARCHAR(7) DEFAULT '#6d4aff',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bookmarks (persistent saves with notes)
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  guid TEXT REFERENCES articles(guid),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, guid)
);

-- SYNC LOG (critical for cross-device reconciliation)
-- Tracks all mutations needing propagation to other installations
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guid TEXT NOT NULL,
  user_device_id TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('article', 'state')),
  operation TEXT CHECK (operation IN ('UPDATE_STATE', 'DELETE_STATE', 'NEW_ARTICLE')),
  payload_json TEXT NOT NULL,   -- Snapshot of changed fields
  created_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
  pushed_to_cloud BOOLEAN DEFAULT 0,
  pulled_from_cloud BOOLEAN DEFAULT 0,
  resolved_conflict BOOLEAN DEFAULT 0
);

CREATE INDEX idx_unpushed ON sync_log(push_to_cloud) WHERE pushed_to_cloud=0;
CREATE INDEX idx_pulled_pending ON sync_log(pulled_from_cloud) WHERE pulled_from_cloud=0;

-- FULL-TEXT SEARCH virtual table (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title,
  summary,
  content_html,
  content='articles',
  content_rowid='rowid'
);

-- Trigger to keep FTS index synchronized
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, summary, content_html)
  VALUES (new.rowid, new.title, new.summary, new.content_html);
END;

CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, content_html)
  VALUES('delete', old.rowid, old.title, old.summary, old.content_html);
END;

CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, content_html)
  VALUES('delete', old.rowid, old.title, old.summary, old.content_html);
  INSERT INTO articles_fts(rowid, title, summary, content_html)
  VALUES (new.rowid, new.title, new.summary, new.content_html);
END;

-- SETTINGS store (lightweight user preferences)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings(key, value_json) VALUES 
('theme', '{"mode":"dark"}'),
('default_view', '"card"'),
('sync_interval_seconds', '300'),
('auto_fetch_full_text', 'true');
```

# Frontend Component Structure (Updated)
```
src/app/
├── app.component.ts
├── app.config.ts
├── app.routes.ts
├── core/
│   ├── guards/
│   │   └── initialization.guard.ts     // Ensures SQLite opened before routing
│   ├── services/
│   │   ├── db.service.ts               // Singleton SQLite wrapper
│   │   ├── sync-worker.service.ts      // Background poller/reconciler
│   │   ├── feed-fetcher.service.ts     // Direct browser HTTP fetches
│   │   ├── article-cache.service.ts    // Manages local file storage
│   │   └── notification.service.ts
│   └── models/
│       ├── user.model.ts
│       ├── feed.model.ts
│       ├── article.model.ts
│       └── folder.model.ts
├── features/
│   ├── auth/
│   │   └── setup-profile/              // First-run wizard (device name, etc.)
│   ├── dashboard/
│   │   ├── dashboard.component.ts
│   │   ├── quick-stats-widget/
│   │   ├── unread-counter-badge/
│   │   └── recent-updates-panel/
│   ├── feed-list/
│   │   ├── feed-list.component.ts
│   │   ├── add-feed-modal/
│   │   ├── opml-import-dialog/
│   │   └── feed-item-card/
│   ├── article-view/
│   │   ├── article-detail.component.ts
│   │   ├── offline-content-display/
│   │   └── related-articles-panel/
│   ├── folder-manager/
│   │   ├── folder-tree.component.ts
│   │   ├── folder-edit-modal/
│   │   └── drag-drop-sorting/
│   ├── search/
│   │   ├── search-bar.component.ts
│   │   └── advanced-filter-pane/
│   └── sync-status/
│       ├── sync-indicator/              // Shows last-sync timestamp/conflicts
│       └── conflict-resolution-modal/   // Rare manual intervention UI
├── shared/
│   ├── components/
│   │   ├── article-card/
│   │   ├── loading-spinner/
│   │   ├── pagination-controls/
│   │   ├── confirm-dialog/
│   │   └── toast-notification/
│   ├── directives/
│   │   ├── clipboard-copy.directive.ts
│   │   └── infinite-scroll.directive.ts
│   └── pipes/
│       ├── time-from-now.pipe.ts
│       ├── html-sanitize.pipe.ts
│       └── domain-name.pipe.ts
└── environments/
    ├── environment.ts
    └── environment.prod.ts
```

## Key Module Dependencies
```json
{
  "dependencies": {
    "@angular/core": "^18.0.0",
    "@angular/material": "^18.0.0",
    "@angular/cdk": "^18.0.0",
    "@ngx-formly/core": "^6.3.0",
    "signaldb": "^0.10.0",
    "better-sqlite3": "^9.0.0",
    "dexie": "^4.0.0",
    "crypto-js": "^4.2.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/jasmine": "^5.1.0",
    "cypress": "^13.13.0",
    "sqlite3-cli": "^1.2.0"
  }
}
```

    Note on SQLite Access Options:

        WebAssembly Mode (Browser): sql.js or @denysvuika/angular-sqlite3 for pure browser runtime
        Node/Electron Wrapper: If packaging as desktop app, use better-sqlite3 native binding
        Service Worker Backend: IndexedDB fallback for mobile PWAs with larger quota

# Local-First Sync Protocol

## Sync Worker Flow (Every N Seconds)

```TypeScript
class SyncWorkerService {
  private intervalMs = 300_000; // 5 minutes default
  private cloudStoragePath = 'C:\\Users\\Name\\OneDrive\\RSSReader';

  constructor(private db: DbService) {}

  async start() {
    setInterval(() => this.reconcile(), this.intervalMs);
    await this.initialReconcile(); // Run once on startup
  }

  /** Called periodically to sync with cloud storage */
  async reconcile(): Promise<SyncResult> {
    const deviceId = await this.getUserId();

    // PHASE 1: Detect cloud storage changes (timestamp check)
    const cloudTimestamp = await this.getCloudLastModified(this.cloudStoragePath);
    const localKnownTimestamp = await this.getLastSyncTime();

    if (cloudTimestamp <= localKnownTimestamp) {
      return { unchanged: true }; // Nothing new to pull
    }

    // PHASE 2: Load remote snapshot from cloud (copy temp to memory)
    const remoteDb = await this.loadRemoteSnapshot();

    // PHASE 3: Identify diverged records
    const { pullLog, pushLog } = await this.compareDatabases({
      local: this.db,
      remote: remoteDb,
      device_id: deviceId
    });

    // PHASE 4: Apply remote changes locally (pull)
    for (const logEntry of pullLog) {
      await this.applyRemoteUpdate(logEntry);
    }
    await this.markPullComplete(pullLog.map(l => l.id));

    // PHASE 5: Commit local changes remotely (push)
    for (const logEntry of pushLog) {
      await this.writeToRemoteCloud(logEntry);
    }
    await this.markPushComplete(pushLog.map(l => l.id));

    // PHASE 6: Record completion timestamp
    await this.saveLastSyncTime(cloudTimestamp);

    return { 
      pulled: pullLog.length, 
      pushed: pushLog.length,
      conflicts_detected: /* count */
    };
  }

  /** Resolve potential state conflicts using timestamp heuristic */
  resolveStateConflict(localState, remoteState): ArticleState {
    if (!localState && !remoteState) {
      throw new Error('Both states undefined - impossible scenario');
    }
    
    if (!localState) {
      return { ...remoteState, source: 'remote' };
    }

    if (!remoteState) {
      return { ...localState, source: 'local' };
    }

    // Timestamp comparison determines winner
    if (remoteState.last_changed_ts > localState.last_changed_ts) {
      console.log(`[${deviceId}] Applying newer remote state for ${remoteState.guid}`);
      return { ...remoteState, merged: true, conflict_resolved: true };
    } else {
      console.log(`[${deviceId}] Keeping local state (fresher)`);
      return { ...localState, merged: false };
    }
  }

  /** Log all outgoing mutations to cloud-stored sync queue */
  async writeToRemoteCloud(entry: SyncLogEntry): Promise<void> {
    // Append to cloud sync_log.csv or batch-write SQLite append
    // Implementation depends on chosen cloud storage provider
    
    // Example for CSV-style append (simplest for OneDrive):
    const csvLine = `${entry.id},${entry.guid},${entry.operation},${JSON.stringify(entry.payload)},${entry.created_ts}\n`;
    await fs.appendFile(path.join(this.cloudStoragePath, 'sync_queue.csv'), csvLine);
  }

  /** Process incoming remote mutation logs */
  async applyRemoteUpdate(entry: SyncLogEntry): Promise<void> {
    switch (entry.entity_type) {
      case 'state':
        await this.db.run(
          `UPDATE article_states 
           SET is_read=?, is_starred=?, last_changed_ts=? 
           WHERE guid=? AND user_device_id != ?`,
          [
            entry.payload.is_read ?? 0,
            entry.payload.is_starred ?? 0,
            entry.payload.timestamp,
            entry.guid,
            await this.getUserId()
          ]
        );
        break;
        
      case 'article':
        // Already have article, just mark existence confirmed
        await this.db.run(
          `UPDATE articles SET verified_remote=? WHERE guid=?`,
          [1, entry.guid]
        );
        break;
    }
  }
}
```

## Cloud-Side File Layout

Each installation contributes changes asynchronously; cloud folder grows incrementally.

```
~/OneDrive/RSSReader/
├── file.db                           # SQLite metadata (full replica on each machine)
├── articles_cache/                   # Subdirectory tree keyed by GUID prefixes
│   ├── a3/
│   │   └── a3b5f2e8-... .html
│   ├── b7/
│   │   └── b7c9d1a4-... .md
│   └── ...
├── sync_queue.csv                    # Change log for remote consumption
├── settings.json                     # User preferences (conflict-prone, handled specially)
└── LAST_SYNC.txt                     # Unix timestamp marker (prevents redundant pulls)
```

## Article Caching Strategy

Articles fetched by one device are saved locally only, not uploaded to cloud. To ensure offline access:

```Typescript
class ArticleCacheService {
  async prefetchArticle(article: ArticleDTO): Promise<void> {
    // Hash guide to create filesystem-safe filename
    const cacheDir = path.join(this.rootPath, 'articles_cache', article.guid.substring(0, 2));
    
    await fs.mkdir(cacheDir, { recursive: true });
    
    const filePath = path.join(cacheDir, `${article.guid}.html`);
    
    // Store rendered HTML (stripped, cleaned markup)
    const sanitizedHtml = sanitizeHtml(article.content_html);
    await fs.writeFile(filePath, sanitizedHtml, 'utf8');
    
    // Also cache metadata as sidecar JSON (for quick indexing)
    const metaPath = filePath.replace('.html', '.meta.json');
    await fs.writeFile(metaPath, JSON.stringify({
      title: article.title,
      published_at: article.published_at,
      external_url: article.external_link_url,
      cache_timestamp: Date.now()
    }), 'utf8');
  }

  async getOfflineContent(guide: string): Promise<string | null> {
    const cacheDir = path.join(this.rootPath, 'articles_cache', guid.substring(0, 2));
    const filePath = path.join(cacheDir, `${guide}.html`);
    
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return null; // Not cached yet
    }
  }

  cleanupOldCache(maxAgeDays = 30): void {
    // Remove entries older than threshold to reclaim disk space
    const cutoff = Date.now() - maxAgeDays * 86_400_000;
    // Iterate through articles_cache/* and delete matching meta timestamps
  }
}
```

## Security Requirements (Adjusted for Local-First)

### authentication:
- local_profile_verification (PIN/password optional, not mandatory for single-user)
- device_id generation uses cryptographically secure random generator
  
### data_protection:
- SQL injection prevention via parameterized queries ✓
- XSS mitigation with DOMPurify sanitization ✓
  
```
FILESYSTEM SECURITY:
  ├─ Validate article paths against base directory (prevent escape attacks)
  ├─ Sanitize filenames (remove slashes, reserved characters)
  ├─ Limit total cache size (configurable GB limit, automatic eviction)
  
SYNC PROTECTION:
  ├─ Signature verification for sync payloads (HMAC optional)
  ├─ Rate-limiting sync attempts (prevent rapid-fire loops)
  └─ Encryption-at-rest for SQLite file (SQLCipher extension recommended)

NETWORK SECURITY:
  ├─ Enforce HTTPS for external feed fetching
  ├─ Certificate pinning optional (advanced setting)
  └─ Block localhost/internal IPs in feed URLs (prevent SSRF-like issues)
```

## Testing Strategy (With Caveats)

### Unit Tests (Karma/Jasmine)

```
ng test --code-coverage
```

Required coverage thresholds:
- Services: 80% minimum
- Components: 60% minimum
- Sync Logic: 90% minimum (CRITICAL PATH)

## Integration Tests (Simulate Multi-Device Scenarios)

Since there's no actual network server, mock cloud storage operations:

```
describe('Cross-Device Sync Simulation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{
        provide: CLOUD_STORAGE_SERVICE,
        useClass: MockCloudStorageService  // Writes to temp folder
      }]
    });
  });

  it('should propagate read-state from Device A to Device B', async () => {
    const deviceA = await createSimulatedInstance('Device-A');
    const deviceB = await createSimulatedInstance('Device-B');

    // Simulate user marks article as read on A
    await deviceA.articleService.markRead('abc-123-guid');
    
    // Force sync cycle on A (upload changes)
    await deviceA.syncService.executeImmediateSync();

    // Advance simulated time to trigger B's next poll
    jest.advanceTimersByTime(300_000);

    // Verify B picked up the change
    expect(await deviceB.getStatus('abc-123-guid')).toBe(true); // Read
  });

  it('should handle conflicting updates gracefully', async () => {
    // Both devices mark/stars same article within milliseconds
    const simultaneousUpdates = await runConcurrentTests([
      deviceA.starArticle('xyz-789'),
      deviceB.unstarArticle('xyz-789')
    ]);

    const finalState = await deviceA.queryStatus('xyz-789');
    
    // Last-write-wins ensures consistency (though potentially unexpected result)
    expect(finalState).toBeDefined();
    expect(finalState.conflict_resolved).toBeTrue();
  });
});
```

## Stress Test Script

```javascript
// Generate synthetic workload simulating heavy usage
async function stressTest(databasePath: string) {
  const db = await openDatabase(databasePath);
  
  // Insert 10,000 fake articles
  for (let i = 0; i < 10000; i++) {
    await db.run(
      'INSERT INTO articles (guid, title, published_at, ...) VALUES (?, ?, ...)',
      [`test-${i}`, `Art Title ${i}`, new Date()]
    );
  }

  // Measure query performance
  const start = performance.now();
  await db.all(
    'SELECT * FROM article_states WHERE is_read=false LIMIT 100'
  );
  const elapsed = performance.now() - start;

  console.log(`Query time: ${elapsed.toFixed(2)}ms for 10k rows`);
  // Target: <50ms response time expected
}
```

# Deployment Configuration

## Option A: Pure Browser (PWA, No Native Runtime)

Use sql.js (compiled to WebAssembly) so user runs entirely in Chrome/Firefox.

```javascript
<!-- index.html loads bundled Angular app -->
<script src="dist/browser/main.js"></script>
<link rel="manifest" href="/manifest.webapp">
<meta name="theme-color" content="#6d4aff">

<style>
  progress-db-loading::after { content: "Initializing local database..."; }
</style>
```

Pros: No installation script required, works instantly after download
Cons: Browser memory limits (~2GB indexedDB cap typically), harder to attach debuggers

## Option B: Electron Desktop App

Package Angular frontend wrapping Node.js SQLite runtime.

```json
// package.json (Electron builder)
{
  "main": "electron/main.js",
  "scripts": {
    "electron:start": "electron .",
    "build:electron": "electron-builder --win --mac --linux"
  },
  "electronBuilder": {
    "appId": "com.rssreader.local",
    "extraMetadata": {
      "main": "dist-electron/main.js"
    }
  }
}
```

Pros: Full file system access (large cache quotas), background workers always running
Cons: ~150MB installed size, requires OS-level install permissions

## Option C: Progressive Hybrid (Recommended)

Start as PWA; offer optional Electron installer for power users wanting persistent background sync.

```javascript
// Register service worker for offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('SW registered:', registration.scope);
  });
}

// Periodic background sync hook
navigator.serviceWorker.ready.then(async sw => {
  await sw.update();
  // Request periodic background sync
  if ('periodicSync' in Registration.prototype) {
    await sw.periodicSync.register('rss-sync', {
      minInterval: 300_000 // 5 minutes
    });
  }
});
```

# Production Checklist (Self-Hosted Variant)

- [ ] Environment configuration encrypted (`.env.enc` decrypted at runtime)
- [ ] Initial user profile wizard guides through setup
- [ ] SQLite file permissions restricted (owner read/write only)
- [ ] Automatic backups scheduled (daily incremental dump to secondary location)
- [ ] Error monitoring integrated via Sentry (anonymous crash reports opt-in)
- [ ] Log files rotate weekly (keep last 3 months)
- [ ] Health check visible in Settings panel ("Database integrity checked OK")
- [ ] Recovery mode documented (how to restore from `.backup` snapshot)
- [ ] Cache purge utility accessible (clear article downloads manually)
- [ ] Support documentation updated with troubleshooting tips for sync conflicts

## Development Workflow Instructions
Initial Setup Steps

# Clone repository
git clone https://github.com/org/rss-reader-local.git
cd rss-reader-local

# Install dependencies
npm install

# Initialize local test database (in-memory or temp folder)
npm run db:init:test

# Run development server
ng serve

# Access application
open http://localhost:4200

Creating Second Installation (Multi-Device Simulation)

# Terminal 1 (Simulates Machine A)
mkdir ~/temp/install-a
cp -r dist/browser/* ~/temp/install-a/
cd ~/temp/install-a
node -e "console.log('Install A ready')"

# Terminal 2 (Simulates Machine B pointing to SAME OneDrive folder)

```
mkdir ~/temp/install-b
cp -r dist/browser/* ~/temp/install-b/
ln -s ~/OneDrive/RSSReader ~/temp/install-b/shared_storage
cd ~/temp/install-b
node -e "console.log('Install B connected to shared storage')"
```

Verify both instances can ping/update the sync log and detect each other's presence.

## Git Branch Naming Convention

Same as original spec (unchanged):

- feat/add-opml-import
- fix/sync-conflict-handling
- docs/api-endpoint-documentation
- chore/bump-angular-version
- refactor/state-management-lite

## Performance Targets (Localized)

Metric|Target Measurement|Tool
------|------------------|----
First render time | ≤1.5s | Lighthouse CI
Database open time | ≤500ms | Timing middleware init
Scroll performance (1k cards) | ≥55fps | Chrome DevTools Performance Tab
FTS5 query time (keyword match) | ≤100ms | EXPLAIN QUERY PLAN analysis
Sync roundtrip latency | ≤30s average | Network timing simulation
Disk space used per 1000 articles | ≤200MB | Directory size calculation
Accessibility Compliance

Identical to original spec (WCAG 2.1 AA standards remain mandatory).

# Deliverables Milestones (Hybrid Timeline)
Sprint 1 (Week 1-2)

- Project scaffolding complete (Angular CLI setup)
- SQLite integration working in browser/Node ✨ NEW
- Basic folder/tree CRUD operations

Sprint 2 (Week 3-4)

- Feed subscription flow working end-to-end
- Article listing with proper pagination
- Sync worker skeleton implemented (mock cloud) ✨ NEW
- Article detail view with offline content fallback

Sprint 3 (Week 5-6)

- URL content extraction pipeline functioning
- Advanced search and filtering capabilities
- Tagging system implemented
- Multi-device sync validation successful ✨ NEW

Sprint 4 (Week 7-8)

- OPML import/export validated
- Performance optimization passes completed
- Security audit focused on local storage exposure ✨ ADJUSTED
- Deployment automation documented (PWA + optional Electron installer)

Launch Phase

- Staging environment parity confirmed
- User accepts disclaimer about eventual sync consistency - guarantees ✨ NEW
- Monitoring dashboards active
- Backup restore procedure verified

# Additional Agent Notes (Critical Updates)

Migration Considerations from Central Server Model

When switching from centralized to hybrid architecture:

- All state becomes distributed — accept that temporary - inconsistencies may occur during sync windows
- No authoritative master database — trust is symmetric between - devices
- Backup responsibility shifts to user — cloud provider is just - sync conduit, not recovery point (recommend secondary local - snapshots)
- Article content stays per-device — saving bandwidth but - increasing storage footprint proportionally to number of - installations

# Tradeoff Transparency Document

## Known Limitations of Local-First Architecture

⚠️ Sync Latency: Changes take 30 seconds to 5 minutes to appear on other devices depending on configuration.

⚠️ Temporary Conflicts: Rapid editing on multiple devices may result in state overwrites (mitigated via timestamp-based resolution).

⚠️ Storage Growth: Cached articles consume roughly 2–10 KB each × number of installs × feed activity rate. Plan disk allocation accordingly.

⚠️ Cloud Dependency: While read operations work entirely offline, syncing requires cloud storage availability. Configure alternative mechanisms for air-gapped scenarios.

💡 Workarounds Provided:
- Manual "Force Sync Now" button bypasses polling intervals
- Export/import OPML for migrating existing subscriptions
- Secondary backup routine documented in /docs/BACKUP_RECOVERY.md

# Before declaring feature-complete, verify these scenarios:

✓ User adds feed on Laptop A → appears on Desktop B within sync interval
✓ Mark-as-read performed offline syncs correctly upon reconnection
✓ Deletion cascades properly across all known peers
✓ Large article cache does not slow initial load (lazy indexing works)
✓ Concurrent star-toggle resolves deterministically (same winner regardless of device order)
✓ OPML export/import retains all structural relationships intact
✓ SQLite vacuum optimizes database file after bulk deletes (<1 hour process for 1M records)
✓ Service worker successfully caches critical JS assets for 7 days offline usage
✓ Settings migrations preserve backward compatibility across major version jumps
