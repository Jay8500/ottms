import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController, ToastController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, saveOutline, arrowDownCircleOutline,
  closeCircleOutline, checkmarkCircleOutline, walletOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { AdminSearchbarComponent } from '../shared/admin-searchbar.component';
import { DataService } from '../../shared/data.service';
import { ExportService } from '../../shared/export.service';
import { humanError } from '../../shared/errors';
import { WalletSummary } from '../../shared/models';

/** Editable copy of a row, so an abandoned edit doesn't mutate the list. */
interface WalletRow extends WalletSummary {
  editing: boolean;
  draftTotal: number;
  draftLocked: number;
  draftUnlocked: number;
}

/** 9 — Wallet. Every user's balances, editable by admin. */
@Component({
  selector: 'app-walletadmin',
  templateUrl: './walletadmin.page.html',
  styleUrls: ['./walletadmin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, AdminSearchbarComponent, IonRefresher, IonRefresherContent
  ],
})
export class WalletadminPage implements OnInit {
  term = '';
  rows: WalletRow[] = [];
  shown: WalletRow[] = [];

  constructor(
    private data: DataService,
    private exporter: ExportService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      createOutline, saveOutline, arrowDownCircleOutline,
      closeCircleOutline, checkmarkCircleOutline, walletOutline,
    });
  }

  async ngOnInit() {
    const summaries = await this.data.getWalletSummaries();
    this.rows = summaries.map(s => ({
      ...s, editing: false,
      draftTotal: s.total, draftLocked: s.locked, draftUnlocked: s.unlocked,
    }));
    this.apply();
  }

  apply() {
    const t = this.term.trim().toLowerCase();
    this.shown = !t ? [...this.rows] : this.rows.filter(r =>
      r.name.toLowerCase().includes(t) || String(r.uniqueNumber).includes(t));
  }

  edit(r: WalletRow) {
    r.editing = true;
    r.draftTotal = r.total; r.draftLocked = r.locked; r.draftUnlocked = r.unlocked;
  }

  cancel(r: WalletRow) { r.editing = false; }

  async save(r: WalletRow) {
    const total = Number(r.draftTotal) || 0;
    const locked = Number(r.draftLocked) || 0;
    const unlocked = Number(r.draftUnlocked) || 0;

    if (locked + unlocked !== total) {
      this.toast(`Locked + Unlocked must equal Total (₹${(locked + unlocked).toLocaleString('en-IN')} ≠ ₹${total.toLocaleString('en-IN')})`);
      return;
    }
    if (locked < 0 || unlocked < 0) { this.toast('Amounts cannot be negative'); return; }

    // A reason is mandatory — this is the one place money moves without a
    // purchase or payout behind it, so it has to say why.
    const alert = await this.alertCtrl.create({
      header: `Adjust ${r.name}'s wallet`,
      subHeader: `Locked ₹${locked.toLocaleString('en-IN')} · Unlocked ₹${unlocked.toLocaleString('en-IN')}`,
      inputs: [{
        name: 'reason', type: 'text',
        placeholder: 'Why? e.g. refund for failed payment',
      }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (d) => {
            if (!d.reason?.trim()) { this.toast('Please give a reason'); return false; }
            try {
              await this.data.saveWallet(r.userId, total, locked, unlocked, d.reason.trim());
              r.total = total; r.locked = locked; r.unlocked = unlocked;
              r.editing = false;
              this.toast(`${r.name}'s wallet updated`);
            } catch (e) {
              this.toast(humanError(e, 'Could not update the wallet'));
            }
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  exportCsv() {
    if (!this.shown.length) { this.toast('Nothing to export'); return; }
    this.exporter.download<WalletRow>('wallets', [
      ['name', 'User'], ['uniqueNumber', 'User ID'],
      ['total', 'Total'], ['locked', 'Locked'], ['unlocked', 'Unlocked'],
      ['withdrawCount', 'Withdrawals'], ['withdrawDeclined', 'Declined'],
      ['withdrawSuccess', 'Successful'], ['fundsAdded', 'Funds Added'], ['net', 'Net'],
    ], this.shown);
    this.toast(`Exported ${this.shown.length} wallets`);
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }

}