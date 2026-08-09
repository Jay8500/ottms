import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController, ToastController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imageOutline, timeOutline, receiptOutline } from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { AdminSearchbarComponent, FilterChip } from '../shared/admin-searchbar.component';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { DataService } from '../../shared/data.service';
import { ExportService } from '../../shared/export.service';
import { WalletTx } from '../../shared/models';

/** 10 — Transactions. Every money movement across all users. */
@Component({
  selector: 'app-admin-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, AdminSearchbarComponent, OttLogoComponent, IonRefresher, IonRefresherContent
  ],
})
export class TransactionsPage implements OnInit {
  term = '';
  activeChip = 'all';
  all: WalletTx[] = [];
  shown: WalletTx[] = [];

  chips: FilterChip[] = [
    { key: 'all',      label: 'All',              tone: 'plain' },
    { key: 'credited', label: 'Amount Credited',  tone: 'green' },
    { key: 'withdraw', label: 'Amount Withdraw.', tone: 'red' },
  ];

  constructor(
    private data: DataService,
    private exporter: ExportService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ imageOutline, timeOutline, receiptOutline });
  }

  async ngOnInit() {
    this.all = await this.data.getTransactions();
    this.apply();
  }

  apply() {
    const t = this.term.trim().toLowerCase();
    this.shown = this.all.filter(x => {
      if (this.activeChip === 'credited' && x.txType !== 'funded')  return false;
      if (this.activeChip === 'withdraw' && x.txKind !== 'withdraw') return false;
      if (!t) return true;
      return [x.partyName, x.partyMobile, x.txnRef, x.ottName, String(x.partyUniqueNum)]
        .some(v => v?.toLowerCase().includes(t));
    });
  }

  setChip(k: string) { this.activeChip = k; this.apply(); }

  /** Rows for an OTT purchase/sale show the platform; money rows show the UPI app. */
  isOttRow(x: WalletTx) { return !!x.brand; }

  statusLabel(x: WalletTx) {
    return x.status === 'pending' ? 'Pending for Approval'
         : x.status === 'rejected' ? 'Rejected' : 'Paid';
  }

  async viewImage(x: WalletTx) {
    const alert = await this.alertCtrl.create({
      header: 'Payment Screenshot',
      subHeader: x.txnRef ? 'Txn ID: ' + x.txnRef : undefined,
      message: x.screenshotUrl
        ? `<img src="${x.screenshotUrl}" style="width:100%;border-radius:8px" />`
        : 'No screenshot was attached to this transaction.',
      buttons: ['Close'],
    });
    await alert.present();
  }

  exportCsv() {
    if (!this.shown.length) { this.toast('Nothing to export'); return; }
    this.exporter.download<WalletTx>('transactions', [
      ['txDate', 'Date'], ['txTime', 'Time'], ['txKind', 'Type'],
      ['partyName', 'User'], ['partyUniqueNum', 'User ID'], ['partyMobile', 'Mobile'],
      ['paymentApp', 'Payment App'], ['ottName', 'OTT'], ['tierLabel', 'Plan'],
      ['months', 'Months'], ['dateFrom', 'From'], ['dateTo', 'To'],
      ['amount', 'Amount'], ['status', 'Status'], ['txnRef', 'Txn Ref'],
    ], this.shown);
    this.toast(`Exported ${this.shown.length} transactions`);
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