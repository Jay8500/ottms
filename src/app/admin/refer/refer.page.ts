import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonFooter, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shareSocialOutline, saveOutline, peopleOutline, cashOutline,
  checkmarkCircle, timeOutline, giftOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { DataService } from '../../shared/data.service';
import { ExportService } from '../../shared/export.service';
import { humanError } from '../../shared/errors';
import { Referral } from '../../shared/models';

/** 17 — Refer Friends. Reward amount, master switch, and who has invited whom. */
@Component({
  selector: 'app-admin-refer',
  templateUrl: './refer.page.html',
  styleUrls: ['./refer.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon, IonFooter,
    AdminHeaderComponent,
  ],
})
export class AdminReferPage implements OnInit {
  enabled = true;
  reward = 0;
  dirty = false;

  rows: Referral[] = [];
  loading = true;

  constructor(
    private data: DataService,
    private exporter: ExportService,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      shareSocialOutline, saveOutline, peopleOutline, cashOutline,
      checkmarkCircle, timeOutline, giftOutline,
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    try {
      const [settings, referrals] = await Promise.all([
        this.data.getSettings(),
        this.data.getReferrals(),
      ]);
      this.reward = Number(settings['referral_reward'] ?? 0);
      this.enabled = settings['referral_enabled'] !== false;
      this.rows = referrals;
    } catch (e) {
      this.toast(humanError(e, 'Could not load referrals'));
    } finally {
      this.loading = false;
    }
  }

  async refresh(ev: CustomEvent) {
    await this.load();
    (ev.target as HTMLIonRefresherElement).complete();
  }

  get joined()   { return this.rows.filter(r => r.referredId).length; }
  get rewarded() { return this.rows.filter(r => r.rewarded).length; }
  get owed() {
    return this.rows.filter(r => r.referredId && !r.rewarded).length * this.reward;
  }

  async save() {
    if (this.reward < 0) { this.toast('Reward cannot be negative'); return; }
    try {
      await this.data.saveSettings({
        referral_reward: this.reward,
        referral_enabled: this.enabled,
      });
      this.dirty = false;
      this.toast('Referral settings saved');
    } catch (e) {
      this.toast(humanError(e, 'Could not save'));
    }
  }

  exportCsv() {
    if (!this.rows.length) { this.toast('Nothing to export'); return; }
    this.exporter.download<Referral>('referrals', [
      ['code', 'Code'], ['referrerName', 'Referred by'],
      ['referredName', 'Joined'], ['rewardAmount', 'Reward'],
      ['rewarded', 'Paid'], ['createdAt', 'Date'],
    ], this.rows);
    this.toast(`Exported ${this.rows.length} referrals`);
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2400, position: 'bottom' });
    t.present();
  }
}