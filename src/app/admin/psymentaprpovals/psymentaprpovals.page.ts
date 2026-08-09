import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController, ToastController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imageOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { AdminSearchbarComponent, FilterChip } from '../shared/admin-searchbar.component';
import { DataService } from '../../shared/data.service';
import { ExportService } from '../../shared/export.service';
import { WalletTx } from '../../shared/models';

/** 11 — Payment's. Add-fund and withdraw requests awaiting an admin decision. */
@Component({
  selector: 'app-psymentaprpovals',
  templateUrl: './psymentaprpovals.page.html',
  styleUrls: ['./psymentaprpovals.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, AdminSearchbarComponent, IonRefresher, IonRefresherContent
  ],
})
export class PsymentaprpovalsPage implements OnInit {
  term = '';
  activeChip = 'payment';
  all: WalletTx[] = [];
  shown: WalletTx[] = [];

  chips: FilterChip[] = [
    { key: 'payment',  label: "Payment Request's",  tone: 'green' },
    { key: 'withdraw', label: "Withdraw Request's", tone: 'red' },
  ];

  /** Canned rejection reasons from the admin deck. */
  readonly reasons = ['Wait Time 24-48 Hrs', 'Insufficient Funds', 'Screenshot Unclear', 'Amount Mismatch'];

  constructor(
    private data: DataService,
    private exporter: ExportService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ imageOutline, timeOutline, checkmarkCircleOutline, closeCircleOutline });
  }

  async ngOnInit() { await this.reload(); }

  private async reload() {
    this.all = await this.data.getTransactions();
    this.apply();
  }

  apply() {
    const t = this.term.trim().toLowerCase();
    this.shown = this.all.filter(x => {
      if (x.status !== 'pending') return false;
      const wantKind = this.activeChip === 'withdraw' ? 'withdraw' : 'addfund';
      if (x.txKind !== wantKind) return false;
      if (!t) return true;
      return [x.partyName, x.partyMobile, String(x.partyUniqueNum)]
        .some(v => v?.toLowerCase().includes(t));
    });
  }

  setChip(k: string) { this.activeChip = k; this.apply(); }

  async approve(x: WalletTx) {
    const alert = await this.alertCtrl.create({
      header: 'Approve request?',
      message: `₹${x.amount.toLocaleString('en-IN')} for ${x.partyName} (${x.partyUniqueNum}).` +
               (x.txKind === 'withdraw'
                 ? ' Pay the user manually first, then confirm.'
                 : ' This credits their wallet.'),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: async () => {
            await this.data.setTxStatus(x.id, 'cleared');
            await this.reload();
            this.toast('Approved — user notified');
          },
        },
      ],
    });
    await alert.present();
  }

  async reject(x: WalletTx) {
    const alert = await this.alertCtrl.create({
      header: 'Reject request',
      subHeader: 'Pick a reason — the user sees this.',
      inputs: this.reasons.map((r, i) => ({
        name: 'reason', type: 'radio' as const, label: r, value: r, checked: i === 0,
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          handler: async (reason: string) => {
            await this.data.setTxStatus(x.id, 'rejected', reason);
            await this.reload();
            this.toast('Rejected — ' + reason);
          },
        },
      ],
    });
    await alert.present();
  }

  async viewImage(x: WalletTx) {
    const alert = await this.alertCtrl.create({
      header: 'Payment Screenshot',
      message: x.screenshotUrl
        ? `<img src="${x.screenshotUrl}" style="width:100%;border-radius:8px" />`
        : 'The user did not attach a screenshot to this request.',
      buttons: ['Close'],
    });
    await alert.present();
  }

  exportCsv() {
    if (!this.shown.length) { this.toast('Nothing to export'); return; }
    this.exporter.download<WalletTx>('payment-requests', [
      ['txDate', 'Date'], ['txTime', 'Time'], ['txKind', 'Type'],
      ['partyName', 'User'], ['partyUniqueNum', 'User ID'], ['partyMobile', 'Mobile'],
      ['paymentApp', 'Payment App'], ['amount', 'Amount'], ['status', 'Status'],
    ], this.shown);
    this.toast(`Exported ${this.shown.length} requests`);
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2200, position: 'bottom' });
    t.present();
  }
  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }

}