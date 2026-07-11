# Azure Setup Guide

Deploys the backend from `backend/ReaderApi.Functions` to Azure Functions on
a Consumption (scale-to-zero) plan, backed by Blob Storage for the sync
document. See `architecture.md` §5 and §10 for why this hosting model was
chosen.

## Prerequisites

- An Azure subscription (a free account's monthly grants comfortably cover a
  single-user app at this scale).
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) installed and signed in (`az login`).
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local) installed (`func --version` should print `4.x`).
- .NET 8 SDK installed (`dotnet --version` should print `8.x`).
- Node.js 18+ and the Angular CLI (`npm install -g @angular/cli`) for the frontend.

Pick names for these — they must be globally unique across Azure, so add a
personal suffix (e.g. your initials or a random string):

| Placeholder | Example |
|---|---|
| `<RESOURCE_GROUP>` | `reader-rg` |
| `<STORAGE_ACCOUNT>` | `readerstorephilip01` (lowercase, no dashes) |
| `<FUNCTION_APP>` | `reader-api-philip01` |
| `<LOCATION>` | `eastus` (or any region near you) |

## 1. Log in and create a resource group

```bash
az login
az group create --name <RESOURCE_GROUP> --location <LOCATION>
```

## 2. Create the storage account and sync container

```bash
az storage account create \
  --name <STORAGE_ACCOUNT> \
  --resource-group <RESOURCE_GROUP> \
  --location <LOCATION> \
  --sku Standard_LRS \
  --kind StorageV2

# Grab the connection string — you'll need it in step 4 and locally.
az storage account show-connection-string \
  --name <STORAGE_ACCOUNT> \
  --resource-group <RESOURCE_GROUP> \
  --query connectionString -o tsv

# Create the container the sync document will live in.
az storage container create \
  --name sync-data \
  --connection-string "<paste the connection string here>"
```

Save that connection string somewhere safe — it's the app setting the
Functions runtime uses to read/write the sync blob (`SyncFunctions.cs`,
`PruneFunctions.cs`).

## 3. Create the Function App (Consumption plan)

```bash
az storage account create \
  --name <STORAGE_ACCOUNT>func \
  --resource-group <RESOURCE_GROUP> \
  --location <LOCATION> \
  --sku Standard_LRS

# ^ Azure Functions requires its own storage account for runtime bookkeeping
# (separate from the one holding your sync data above — keeps the sync blob
# container clean and makes the two concerns easy to reason about).

az functionapp create \
  --name <FUNCTION_APP> \
  --resource-group <RESOURCE_GROUP> \
  --storage-account <STORAGE_ACCOUNT>func \
  --consumption-plan-location <LOCATION> \
  --runtime dotnet-isolated \
  --runtime-version 8 \
  --functions-version 4 \
  --os-type Linux
```

## 4. Configure app settings

```bash
az functionapp config appsettings set \
  --name <FUNCTION_APP> \
  --resource-group <RESOURCE_GROUP> \
  --settings \
    SyncStorageConnectionString="<connection string from step 2>" \
    SyncContainerName="sync-data"
```

## 5. Deploy the backend code

```bash
cd backend/ReaderApi.Functions
func azure functionapp publish <FUNCTION_APP>
```

This builds and pushes `SyncFunctions`, `FeedFetchFunctions`,
`SelectorFunctions`, and the `PruneTombstones` timer job.

## 6. Get the function key

The client authenticates with a function-level key (architecture.md §5.6):

```bash
az functionapp keys list \
  --name <FUNCTION_APP> \
  --resource-group <RESOURCE_GROUP> \
  --query "functionKeys.default" -o tsv
```

Put this value, and the app's base URL, into
`frontend/src/environments/environment.prod.ts`:

```ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://<FUNCTION_APP>.azurewebsites.net/api',
  apiFunctionKey: '<the key from above>',
};
```

Also update the `connect-src` origin in `frontend/src/index.html`'s CSP
`<meta>` tag to `https://<FUNCTION_APP>.azurewebsites.net` (architecture.md
§9.1).

## 7. Enable CORS on the Function App

The Angular client calls the Function App from whatever origin you host it
on (see step 9). Allow that origin:

```bash
az functionapp cors add \
  --name <FUNCTION_APP> \
  --resource-group <RESOURCE_GROUP> \
  --allowed-origins "https://<your-frontend-origin>"
```

For local development, also add `http://localhost:4200`.

## 8. Local development (no Azure resources needed yet)

```bash
# Install Azurite, the local Blob Storage emulator
npm install -g azurite
azurite --silent &

cd backend/ReaderApi.Functions
cp local.settings.json.example local.settings.json
func start
```

The frontend's default `environment.ts` already points at
`http://localhost:7071/api`, matching Core Tools' default port.

```bash
cd frontend
npm install
npm start
```

## 9. Hosting the frontend

Any static host works, since the client is a plain Angular PWA build with
no server-rendering step (architecture.md §9.1 explains why the CSP is
meta-tag based specifically for this reason). Two straightforward options:

**Azure Static Web Apps** (keeps everything in one cloud, free tier available):

```bash
az staticwebapp create \
  --name reader-frontend-<yoursuffix> \
  --resource-group <RESOURCE_GROUP> \
  --location <LOCATION> \
  --source https://github.com/<you>/<your-repo> \
  --branch main \
  --app-location "frontend" \
  --output-location "dist/reader-frontend/browser" \
  --login-with-github
```

**Any other static host** (Netlify, Cloudflare Pages, GitHub Pages, etc.):

```bash
cd frontend
npm run build
# upload the contents of dist/reader-frontend/browser
```

Either way, once you know the frontend's real origin, go back and update the
CORS allowed-origin (step 7) and the CSP `connect-src`/frontend origin to
match.

## 10. Verify

```bash
curl https://<FUNCTION_APP>.azurewebsites.net/api/sync \
  -H "x-functions-key: <your function key>"
```

A `204 No Content` response is correct — it means the endpoint is reachable
and there's no sync document yet (the client will create one on first
save).

## Ongoing costs

At single-user scale: Functions Consumption plan bills per execution and
mostly sits at $0 for this usage pattern; Blob Storage for one small JSON
document is a fraction of a cent per month. The main things that would move
the needle are heavy refresh polling across many feeds — the spec's
staggered-refresh setting (`UserSettings.refreshIntervalMinutes`,
`staggerMs`) is what keeps that in check.
