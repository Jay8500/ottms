import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addCircleOutline, arrowUpCircleOutline, downloadOutline, arrowBackOutline,
  optionsOutline, lockClosedOutline, lockOpenOutline, chatbubbleOutline,
  businessOutline, phonePortraitOutline, timeOutline, closeOutline,
} from 'ionicons/icons';
import { Auth } from '../../auth';
import { DataService } from '../../shared/data.service';
import { ExportService } from '../../shared/export.service';
import { NetworkService } from '../../shared/network.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { humanError } from '../../shared/errors';
import { AppUser, WalletTx } from '../../shared/models';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, OttLogoComponent],
})
export class WalletPage implements OnInit {
  locked = 0;
  unlocked = 0;

  tab: 'all' | 'funded' | 'expense' = 'all';
  private all: WalletTx[] = [];
  shown: WalletTx[] = [];

  me: AppUser | null = null;
  loading = true;
  error = '';

  // Withdraw panel — inline, matching the mockup rather than an alert
  showWithdraw = false;
  amount: number | null = null;
  method: 'bank' | 'upi' = 'bank';
  submitting = false;

  feePct = 0;
  minWithdraw = 0;
  slaHours = 24;

  constructor(
    private router: Router,
    private auth: Auth,
    private data: DataService,
    private exporter: ExportService,
    public net: NetworkService,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      addCircleOutline, arrowUpCircleOutline, downloadOutline, arrowBackOutline,
      optionsOutline, lockClosedOutline, lockOpenOutline, chatbubbleOutline,
      businessOutline, phonePortraitOutline, timeOutline, closeOutline,
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const uid = this.auth.currentUser?.id;
      if (!uid) { this.error = 'Please sign in again.'; return; }

      const [me, txs, settings] = await Promise.all([
        this.data.getUser(uid),
        this.data.getTransactions(uid),
        this.data.getSettings(),
      ]);

      this.me = me;
      this.locked = me?.lockedAmount ?? 0;
      this.unlocked = me?.unlockedAmount ?? 0;
      this.all = txs;

      this.feePct      = Number(settings['withdraw_fee_pct'] ?? 0);
      this.minWithdraw = Number(settings['withdraw_min'] ?? 0);
      this.slaHours    = Number(settings['withdraw_sla_hours'] ?? 24);

      this.applyFilter();
    } catch (e) {
      this.error = 'Could not load your wallet.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  applyFilter() {
    this.shown = this.tab === 'all'
      ? [...this.all]
      : this.all.filter(t => t.txType === this.tab);
  }

  setTab(t: 'all' | 'funded' | 'expense') { this.tab = t; this.applyFilter(); }

  back() { this.router.navigate(['/user/home']); }

  // ── Withdraw ────────────────────────────────────────────────────────────

  get fee() {
    return this.amount ? Math.round(this.amount * this.feePct) / 100 : 0;
  }

  get payout() {
    return this.amount ? Math.round((this.amount - this.fee) * 100) / 100 : 0;
  }

  toggleWithdraw() {
    if (!this.net.canTransact) { this.toast('You are offline — payments are paused'); return; }
    this.showWithdraw = !this.showWithdraw;
  }

  async sendWithdraw() {
    if (!this.amount || this.amount <= 0) { this.toast('Enter an amount'); return; }
    if (this.amount > this.unlocked)      { this.toast('That is more than your unlocked balance'); return; }
    if (this.minWithdraw && this.amount < this.minWithdraw) {
      this.toast(`Minimum withdrawal is ₹${this.minWithdraw}`); return;
    }
    if (!this.me?.bank) { this.toast('Add your bank details before withdrawing'); return; }

    this.submitting = true;
    try {
      await this.data.requestWithdraw(this.amount, this.method === 'upi' ? 'UPI' : 'Bank');
      await this.auth.refresh();
      this.toast(`Request sent. Admin pays out within ${this.slaHours} hours.`);
      this.showWithdraw = false;
      this.amount = null;
      await this.load();
    } catch (e: any) {
      const raw = String(e?.message ?? e);
      this.toast(
        /INSUFFICIENT_FUNDS/.test(raw)
          ? 'Not enough unlocked balance'
          : humanError(e, 'Could not send the request'),
      );
    } finally {
      this.submitting = false;
    }
  }

  addFund() {
    if (!this.net.canTransact) { this.toast('You are offline — payments are paused'); return; }
    this.router.navigate(['/user/payment'], { queryParams: { mode: 'addFund' } });
  }

  openChat(t: WalletTx) {
    this.router.navigate(['/user/chat'], { queryParams: { tx: t.id } });
  }

  statusLabel(t: WalletTx) {
    return t.status === 'pending' ? 'Pending for Approval'
         : t.status === 'rejected' ? (t.rejectReason || 'Rejected')
         : 'Cleared';
  }

  kindLabel(t: WalletTx) {
    switch (t.txKind) {
      case 'withdraw': return 'Withdraw';
      case 'addfund':  return 'Add Fund';
      case 'purchase': return 'Purchase';
      case 'sale':     return 'Sale';
      case 'refund':   return 'Refund';
      case 'penalty':  return 'Penalty';
      default:         return 'Service Fee';
    }
  }

  exportCsv() {
    if (!this.shown.length) { this.toast('Nothing to export'); return; }
    this.exporter.download<WalletTx>('my-transactions', [
      ['txDate', 'Date'], ['txTime', 'Time'], ['txKind', 'Type'],
      ['ottName', 'OTT'], ['months', 'Months'], ['dateFrom', 'From'], ['dateTo', 'To'],
      ['paymentApp', 'Payment App'], ['amount', 'Amount'], ['status', 'Status'],
      ['txnRef', 'Reference'],
    ], this.shown);
    this.toast(`Exported ${this.shown.length} rows`);
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2800, position: 'bottom' });
    t.present();
  }
}