# 🔄 Auto Updater

> Automatic application update service using Tauri's built-in updater plugin.

## Overview

Checks for new versions on application startup, downloads updates with progress tracking, and relaunches the app after installation. Only active in production builds — gracefully degrades in dev mode.

## Source Files

| File | Location | Description |
|------|----------|-------------|
| `updater.ts` | [`services/updater.ts`](../../services/updater.ts) | Complete update lifecycle (~3.9KB) |

## API

```typescript
// Check if update is available
async function checkForUpdates(): Promise<UpdateStatus>

// Download + install with progress callback
async function downloadAndInstallUpdate(
  onProgress?: (downloaded: number, total: number) => void
): Promise<boolean>

// Relaunch app after update
async function relaunchApp(): Promise<void>

// Convenience for startup check
async function checkUpdateOnStartup(): Promise<UpdateStatus>
```

## Key Types

```typescript
interface UpdateInfo {
  version: string;          // New version number
  currentVersion: string;   // Current version
  body: string;             // Release notes
  date: string;             // Release date
}

interface UpdateStatus {
  available: boolean;
  info?: UpdateInfo;
  error?: string;
}
```

## Behavior

| Environment | Behavior |
|-------------|----------|
| Production (`npm run tauri build`) | Full update lifecycle |
| Development (`npm run dev`) | Returns `{ available: false, error: "dev mode" }` |
| Browser | Plugin not loaded, graceful fallback |

## Dependencies

- `@tauri-apps/plugin-updater` — Update checking and download
- `@tauri-apps/plugin-process` — App relaunch

## Depended On By

- **regulation-manager** — Settings tab includes "Check for Updates" button
