import * as Updates from 'expo-updates';
import { AppState, AppStateStatus } from 'react-native';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const SNOOZE_DURATION_MS = 30 * 60 * 1000; // Snooze for 30 minutes if user taps 'Nanti'

export interface UpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  showPopup: boolean;
  updateReleaseDate: Date | null;
  minutesSinceRelease: number | null;
  lastChecked: Date | null;
  error: string | null;
}

type UpdateListener = (state: UpdateState) => void;

class UpdateService {
  private state: UpdateState = {
    isChecking: false,
    isDownloading: false,
    isUpdateAvailable: false,
    showPopup: false,
    updateReleaseDate: null,
    minutesSinceRelease: null,
    lastChecked: null,
    error: null,
  };

  private listeners: Set<UpdateListener> = new Set();
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private snoozeUntil: number = 0;
  private appStateSubscription: any = null;
  private periodicCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupAppStateListener();
  }

  public getState(): UpdateState {
    return { ...this.state };
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  private updateState(partial: Partial<UpdateState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        this.checkForUpdates();
      }
    });

    // Check periodically every 15 minutes while app is running
    this.periodicCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, 15 * 60 * 1000);
  }

  public async checkForUpdates(): Promise<void> {
    if (this.state.isChecking || this.state.isDownloading) return;

    this.updateState({ isChecking: true, error: null });

    try {
      if (!Updates.isEnabled) {
        // In local development / Expo Go, Updates is not enabled.
        this.updateState({
          isChecking: false,
          lastChecked: new Date(),
        });
        return;
      }

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        // Extract createdAt from manifest if available
        const manifest = (update as any).manifest;
        const createdAtStr = manifest?.createdAt || (update as any).createdAt;
        const releaseDate = createdAtStr ? new Date(createdAtStr) : new Date();

        const now = Date.now();
        const elapsedMs = Math.max(0, now - releaseDate.getTime());
        const minutesSince = Math.floor(elapsedMs / (60 * 1000));

        this.updateState({
          isChecking: false,
          isUpdateAvailable: true,
          updateReleaseDate: releaseDate,
          minutesSinceRelease: minutesSince,
          lastChecked: new Date(),
        });

        this.handleReleaseTiming(releaseDate);
      } else {
        this.updateState({
          isChecking: false,
          isUpdateAvailable: false,
          lastChecked: new Date(),
        });
      }
    } catch (err: any) {
      console.warn('[UpdateService] Check update error:', err?.message || err);
      this.updateState({
        isChecking: false,
        error: err?.message || 'Gagal memeriksa pembaruan',
        lastChecked: new Date(),
      });
    }
  }

  private handleReleaseTiming(releaseDate: Date) {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    const now = Date.now();
    const elapsedMs = now - releaseDate.getTime();

    // Check if currently snoozed
    if (now < this.snoozeUntil) {
      return;
    }

    if (elapsedMs >= THIRTY_MINUTES_MS) {
      // 30 minutes after release has passed! Show popup now.
      this.updateState({ showPopup: true });
    } else {
      // Release is less than 30 minutes old. Wait until exact 30 minutes mark.
      const delayMs = THIRTY_MINUTES_MS - elapsedMs;
      this.releaseTimer = setTimeout(() => {
        if (Date.now() >= this.snoozeUntil) {
          this.updateState({ showPopup: true });
        }
      }, delayMs);
    }
  }

  public dismissPopup(snoozeDuration: number = SNOOZE_DURATION_MS) {
    this.snoozeUntil = Date.now() + snoozeDuration;
    this.updateState({ showPopup: false });
  }

  public async applyUpdate(): Promise<void> {
    if (!Updates.isEnabled) {
      this.dismissPopup();
      return;
    }

    this.updateState({ isDownloading: true, error: null });

    try {
      await Updates.fetchUpdateAsync();
      this.updateState({ isDownloading: false, showPopup: false });
      // Reload app immediately into new version
      await Updates.reloadAsync();
    } catch (err: any) {
      console.error('[UpdateService] Failed to download or apply update:', err);
      this.updateState({
        isDownloading: false,
        error: 'Gagal mengunduh pembaruan. Silakan coba lagi nanti.',
      });
    }
  }

  // Developer simulation helper for testing the 30-minute popup behavior
  public simulateUpdate(isImmediate: boolean = true) {
    const releaseDate = isImmediate
      ? new Date(Date.now() - 31 * 60 * 1000) // released 31 minutes ago
      : new Date(Date.now() - 10 * 60 * 1000); // released 10 minutes ago

    const elapsedMs = Date.now() - releaseDate.getTime();
    const minutesSince = Math.floor(elapsedMs / (60 * 1000));

    this.snoozeUntil = 0;
    this.updateState({
      isUpdateAvailable: true,
      updateReleaseDate: releaseDate,
      minutesSinceRelease: minutesSince,
      lastChecked: new Date(),
    });

    this.handleReleaseTiming(releaseDate);
  }

  public destroy() {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
    }
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    this.listeners.clear();
  }
}

export const updateService = new UpdateService();
