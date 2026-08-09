import { Injectable, signal } from '@angular/core';

/**
 * Connectivity tracking.
 *
 * Uses the WebView's own online/offline events, which needs no extra plugin.
 * `navigator.onLine` only reports whether a network interface exists — it can
 * say "online" on a wifi connection with no actual route out. If that proves
 * a problem in the field, swap the body of `start()` for @capacitor/network's
 * `Network.addListener('networkStatusChange', …)`; nothing else has to change.
 */
@Injectable({ providedIn: 'root' })
export class NetworkService {
  /** True when the device believes it has a connection. */
  readonly online = signal<boolean>(true);

  /** Set once the user has been offline, so the banner can show a "back online" flash. */
  readonly justReconnected = signal<boolean>(false);

  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    this.online.set(navigator.onLine !== false);

    window.addEventListener('online', () => {
      this.online.set(true);
      this.justReconnected.set(true);
      setTimeout(() => this.justReconnected.set(false), 2500);
    });

    window.addEventListener('offline', () => {
      this.online.set(false);
      this.justReconnected.set(false);
    });
  }

  /**
   * Guard for anything that moves money — purchase, add fund, withdraw.
   * Browsing and chat stay usable offline, per the agreed spec.
   */
  get canTransact(): boolean { return this.online(); }
}