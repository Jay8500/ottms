import { Injectable } from '@angular/core';

declare global {
  interface Window { Cashfree?: any; }
}

/**
 * Cashfree Checkout.
 *
 * The SDK is loaded from Cashfree's CDN on first use rather than bundled,
 * because they update it for compliance and a pinned copy goes stale.
 * Nothing secret passes through here — the session id is single-use and
 * already tied to an order we created server-side.
 */
@Injectable({ providedIn: 'root' })
export class CashfreeService {
  private loading?: Promise<void>;

  private sdkUrl(mode: 'sandbox' | 'production') {
    return mode === 'production'
      ? 'https://sdk.cashfree.com/js/v3/cashfree.js'
      : 'https://sdk.cashfree.com/js/v3/cashfree.js';
  }

  private load(mode: 'sandbox' | 'production'): Promise<void> {
    if (window.Cashfree) return Promise.resolve();
    if (this.loading) return this.loading;

    this.loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = this.sdkUrl(mode);
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        this.loading = undefined;
        reject(new Error('Could not load the payment page. Check your connection.'));
      };
      document.head.appendChild(s);
    });

    return this.loading;
  }

  /**
   * Opens checkout and resolves once the sheet closes. The result here is
   * only a hint for the UI — the wallet is credited by the webhook, so the
   * caller must confirm against our own order status before believing it.
   */
  async pay(sessionId: string, mode: 'sandbox' | 'production'): Promise<'closed' | 'error'> {
    await this.load(mode);
    if (!window.Cashfree) throw new Error('Payment page unavailable');

    const cashfree = window.Cashfree({ mode });

    try {
      await cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: '_modal',
      });
      return 'closed';
    } catch {
      return 'error';
    }
  }
}
