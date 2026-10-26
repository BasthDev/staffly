import * as Updates from 'expo-updates';
import { AppState, AppStateStatus } from 'react-native';

const SNOOZE_DURATION_MS = 30 * 60 * 1000; // Snooze for 30 minutes if user taps 'Nanti Saja'

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

  public async checkForUpdates(manual: boolean = false): Promise<void> {
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

        // If manual check, clear any snooze so modal always shows
        if (manual) {
          this.snoozeUntil = 0;
        }

        const shouldShowPopup = manual || now >= this.snoozeUntil;

        this.updateState({
          isChecking: false,
          isUpdateAvailable: true,
          showPopup: shouldShowPopup,
          updateReleaseDate: releaseDate,
          minutesSinceRelease: minutesSince,
          lastChecked: new Date(),
        });
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

  // Developer simulation helper for testing immediate popup behavior
  public simulateUpdate() {
    this.snoozeUntil = 0;
    this.updateState({
      isUpdateAvailable: true,
      showPopup: true,
      updateReleaseDate: new Date(),
      minutesSinceRelease: 0,
      lastChecked: new Date(),
    });
  }

  public destroy() {
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
