/**
 * Auto-update service for EnviroAnalyzer Pro
 * Uses Tauri's built-in updater plugin
 */

// Dynamic imports to handle dev/prod modes
let checkFn: (() => Promise<any>) | null = null;
let relaunchFn: (() => Promise<void>) | null = null;

// Initialize updater (only works in production Tauri build)
async function initUpdater() {
  try {
    const updater = await import('@tauri-apps/plugin-updater');
    const process = await import('@tauri-apps/plugin-process');
    checkFn = updater.check;
    relaunchFn = process.relaunch;
    return true;
  } catch (e) {
    console.log('Updater not available (dev mode or browser)');
    return false;
  }
}

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body: string;
  date: string;
}

export interface UpdateStatus {
  available: boolean;
  info?: UpdateInfo;
  error?: string;
}

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  // Check if running in dev mode
  if (import.meta.env.DEV) {
    return {
      available: false,
      error: 'Auto-update is only available in production builds. In development, please use git pull to update.',
    };
  }

  try {
    if (!checkFn) {
      const initialized = await initUpdater();
      if (!initialized) {
        return {
          available: false,
          error: 'Updater plugin not available',
        };
      }
    }

    const update = await checkFn!();
    
    if (update) {
      return {
        available: true,
        info: {
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body || 'No release notes available',
          date: update.date || new Date().toISOString(),
        },
      };
    }
    
    return { available: false };
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download and install update
 */
export async function downloadAndInstallUpdate(
  onProgress?: (downloaded: number, total: number) => void
): Promise<boolean> {
  if (import.meta.env.DEV) {
    throw new Error('Auto-update is only available in production builds');
  }

  try {
    if (!checkFn) {
      await initUpdater();
    }

    const update = await checkFn!();
    
    if (!update) {
      console.log('No update available');
      return false;
    }
    
    let downloaded = 0;
    let contentLength = 0;
    
    // Download with progress
    await update.downloadAndInstall((event: any) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength || 0;
          console.log(`Download started, total size: ${contentLength}`);
          break;
        case 'Progress':
          downloaded += event.data.chunkLength;
          if (onProgress && contentLength > 0) {
            onProgress(downloaded, contentLength);
          }
          break;
        case 'Finished':
          console.log('Download finished');
          break;
      }
    });
    
    console.log('Update installed successfully');
    return true;
  } catch (error) {
    console.error('Failed to download/install update:', error);
    throw error;
  }
}

/**
 * Relaunch the application after update
 */
export async function relaunchApp(): Promise<void> {
  if (relaunchFn) {
    await relaunchFn();
  }
}

/**
 * Check and prompt for updates on startup
 * Returns true if update is available
 */
export async function checkUpdateOnStartup(): Promise<UpdateStatus> {
  // Only check in production
  if (import.meta.env.DEV) {
    return { available: false };
  }
  
  return checkForUpdates();
}
