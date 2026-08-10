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
import { humanError } from '../../shared/errors';
import { BankChangeRequest, ExitRequest, WalletTx } from '../../shared/models';

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
    { key: 'bank',     label: 'Bank Changes',       tone: 'yellow' },
    { key: 'exit',     label: 'Exit Claims',        tone: 'plain' },
  ];

  /** Q4 — payout-destination changes waiting on a decision. */
  bankRequests: BankChangeRequest[] = [];

  /** Faulty-account claims. Approving one refunds the buyer in full and
   *  penalises the seller, so each needs a look at the photo first. */
  exitRequests: ExitRequest[] = [];

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
    const [txs, bank, exits] = await Promise.all([
      this.data.getTransactions(),
      this.data.getBankChangeRequests(),
      this.data.getExitRequests(),
    ]);
    this.all = txs;
    this.bankRequests = bank.filter(b => b.status === 'pending');
    this.exitRequests = exits.filter(e => e.status === 'pending');
    this.apply();
  }

  apply() {
    const t = this.term.trim().toLowerCase();

    if (this.activeChip === 'bank' || this.activeChip === 'exit') { this.shown = []; return; }

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

  // ── Bank change decisions (Q4) ──────────────────────────────────────────

  async approveBank(b: BankChangeRequest) {
    const alert = await this.alertCtrl.create({
      header: 'Approve bank change?',
      message:
        `${b.userName} (${b.userUniqueNum}) wants payouts sent to ` +
        `${b.upiId || b.accountNo}. Confirm this is really them before approving — ` +
        `a stolen account would use this to redirect their money.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: async () => {
            try {
              await this.data.approveBankChange(b.id);
              await this.reload();
              this.toast('Bank details updated');
            } catch (e) {
              this.toast(humanError(e, 'Could not approve'));
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async rejectBank(b: BankChangeRequest) {
    const alert = await this.alertCtrl.create({
      header: 'Reject bank change',
      subHeader: 'The user sees this reason.',
      inputs: [
        { name: 'reason', type: 'radio', label: 'Could not verify identity', value: 'Could not verify identity', checked: true },
        { name: 'reason', type: 'radio', label: 'Details look incorrect',    value: 'Details look incorrect' },
        { name: 'reason', type: 'radio', label: 'Contact support first',     value: 'Contact support first' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          handler: async (reason: string) => {
            try {
              await this.data.rejectBankChange(b.id, reason);
              await this.reload();
              this.toast('Rejected — ' + reason);
            } catch (e) {
              this.toast(humanError(e, 'Could not reject'));
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Faulty-account exit claims ──────────────────────────────────────────

  /** Days the buyer did not get to use, which is what gets refunded. */
  unusedDays(e: ExitRequest) {
    const end = new Date(e.expiresOn).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  async viewExitProof(e: ExitRequest) {
    const alert = await this.alertCtrl.create({
      header: 'Problem photo',
      subHeader: e.note,
      message: e.proofUrl
        ? `Uploaded: ${e.proofUrl}`
        : 'No photo was attached.',
      buttons: ['Close'],
    });
    await alert.present();
  }

  async approveExit(e: ExitRequest) {
    const alert = await this.alertCtrl.create({
      header: 'Accept this claim?',
      message:
        `${e.buyerName} gets their full unused amount back, and ` +
        `${e.sellerName} is penalised for a faulty account. ` +
        `Check the photo first — this moves money away from the seller.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Accept claim',
          handler: async () => {
            try {
              await this.data.approveExitRequest(e.id);
              await this.reload();
              this.toast('Claim accepted — buyer refunded');
            } catch (err) {
              this.toast(humanError(err, 'Could not accept the claim'));
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async rejectExit(e: ExitRequest) {
    const alert = await this.alertCtrl.create({
      header: 'Reject this claim',
      subHeader: 'The buyer sees this reason and stays in the group.',
      inputs: [
        { name: 'reason', type: 'radio', label: 'Photo does not show a problem', value: 'Photo does not show a problem', checked: true },
        { name: 'reason', type: 'radio', label: 'Account is working fine',       value: 'Account is working fine' },
        { name: 'reason', type: 'radio', label: 'Seller has fixed the issue',    value: 'Seller has fixed the issue' },
        { name: 'reason', type: 'radio', label: 'Not enough information',        value: 'Not enough information' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          handler: async (reason: string) => {
            try {
              await this.data.rejectExitRequest(e.id, reason);
              await this.reload();
              this.toast('Claim rejected — ' + reason);
            } catch (err) {
              this.toast(humanError(err, 'Could not reject the claim'));
            }
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