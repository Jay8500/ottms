import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline, copyOutline, cloudUploadOutline, sendOutline,
  arrowBackOutline, helpCircleOutline, checkmarkCircle, businessOutline,
  flashOutline, timeOutline,
} from 'ionicons/icons';
import { Auth } from '../../auth';
import { DataService } from '../../shared/data.service';
import { CashfreeService } from '../../shared/cashfree.service';
import { NetworkService } from '../../shared/network.service';
import { AppMenuService } from '../../shared/app-menu.service';
import { humanError } from '../../shared/errors';
import { PaymentConfig } from '../../shared/models';

type Mode = 'instant' | 'manual';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonIcon],
})
export class PaymentPage implements OnInit {
  private appMenu = inject(AppMenuService);
  openMenu() { this.appMenu.open(); }

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  mode: Mode = 'instant';
  gatewayReady = false;

  cfg: PaymentConfig | null = null;
  loading = true;
  error = '';

  amount: number | null = null;
  txnRef = '';
  paymentApp = '';
  screenshot: File | null = null;
  submitting = false;

  feePct = 0;

  readonly apps = ['PhonePe', 'GPay', 'Paytm', 'Bank'];

  constructor(
    private router: Router,
    private auth: Auth,
    private data: DataService,
    private cashfree: CashfreeService,
    public net: NetworkService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      qrCodeOutline, copyOutline, cloudUploadOutline, sendOutline,
      arrowBackOutline, helpCircleOutline, checkmarkCircle, businessOutline,
      flashOutline, timeOutline,
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const [cfg, settings] = await Promise.all([
        this.data.getPaymentConfig(),
        this.data.getSettings(),
      ]);
      this.cfg = cfg;
      this.feePct = Number(settings['addfund_gateway_fee_pct'] ?? 0);

      // Instant top-up only offered once the gateway is switched on.
      this.gatewayReady = settings['payment_gateway'] === 'cashfree';
      this.mode = this.gatewayReady ? 'instant' : 'manual';
    } catch (e) {
      this.error = 'Could not load payment details.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  back() { this.router.navigate(['/user/wallet']); }

  /** Gateway fee is added on top — the wallet still receives the full amount. */
  get fee() {
    return this.amount ? Math.round(this.amount * this.feePct) / 100 : 0;
  }

  get total() {
    return this.amount ? Math.round((this.amount + this.fee) * 100) / 100 : 0;
  }

  // ── Instant (Cashfree) ──────────────────────────────────────────────────

  async payNow() {
    if (!this.net.canTransact) { this.toast('You are offline — payments are paused'); return; }
    if (!this.amount || this.amount < 10) { this.toast('Minimum top-up is ₹10'); return; }

    this.submitting = true;
    try {
      const order = await this.data.createPaymentOrder(this.amount);
      await this.cashfree.pay(order.paymentSessionId, order.mode);

      // The sheet closing tells us nothing — the webhook decides. Poll our
      // own order for a few seconds before reporting anything to the user.
      const ok = await this.waitForCredit(order.orderId);

      if (ok) {
        await this.auth.refresh();
        this.toast(`₹${order.walletAmount} added to your wallet`);
        this.router.navigate(['/user/wallet']);
      } else {
        this.stillProcessing();
      }
    } catch (e) {
      this.toast(humanError(e, 'Could not start the payment'));
    } finally {
      this.submitting = false;
    }
  }

  /** Polls for up to ~12s; the webhook usually lands in two or three. */
  private async waitForCredit(orderId: string): Promise<boolean> {
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const o = await this.data.getOrderStatus(orderId);
        if (o?.status === 'paid') return true;
        if (o?.status === 'failed') return false;
      } catch { /* keep waiting */ }
    }
    return false;
  }

  private async stillProcessing() {
    const alert = await this.alertCtrl.create({
      header: 'Payment is being confirmed',
      message:
        'If money left your account, it will appear in your wallet shortly. ' +
        'Check your wallet in a minute. Do not pay again.',
      buttons: [
        { text: 'Open wallet', handler: () => this.router.navigate(['/user/wallet']) },
      ],
    });
    await alert.present();
  }

  // ── Manual (UPI + screenshot) ───────────────────────────────────────────

  async copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.toast(`${label} copied`);
    } catch {
      this.toast('Could not copy — long-press to select instead');
    }
  }

  pickFile() { this.fileInput.nativeElement.click(); }

  onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.toast('File must be under 5MB'); return; }
    this.screenshot = file;
  }

  get canSubmitManual() {
    return !!this.amount && this.amount > 0 && !!this.screenshot && !this.submitting;
  }

  async submitManual() {
    if (!this.net.canTransact) { this.toast('You are offline — payments are paused'); return; }
    if (!this.amount || this.amount <= 0) { this.toast('Enter the amount you paid'); return; }
    if (!this.screenshot) { this.toast('Upload your payment screenshot'); return; }

    this.submitting = true;
    try {
      await this.data.requestAddFund({
        amount: this.amount,
        paymentApp: this.paymentApp || undefined,
        txnRef: this.txnRef || undefined,
        screenshot: this.screenshot,
      });
      this.toast('Sent. Your wallet is credited once admin approves.');
      this.router.navigate(['/user/wallet']);
    } catch (e) {
      this.toast(humanError(e, 'Could not send the request'));
    } finally {
      this.submitting = false;
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 3000, position: 'bottom' });
    t.present();
  }
}
