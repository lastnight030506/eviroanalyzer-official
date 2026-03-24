// Auto Updater — Barrel Re-exports
// Source: services/updater.ts

export {
  checkForUpdates,
  downloadAndInstallUpdate,
  relaunchApp,
  checkUpdateOnStartup,
} from '../../services/updater';

export type { UpdateInfo, UpdateStatus } from '../../services/updater';
