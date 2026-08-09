import { Injectable, signal } from '@angular/core';

/**
 * Counts in-flight network calls so the app can show one honest progress bar.
 *
 * A counter rather than a boolean: overlapping requests are normal (a page
 * often fires three queries at once) and a boolean would clear the indicator
 * when the first one finished, while two were still running.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  readonly active = signal(false);

  start() {
    this.count++;
    if (this.count === 1) this.active.set(true);
  }

  stop() {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) this.active.set(false);
  }
}