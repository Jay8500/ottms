import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonRefresher, IonRefresherContent,
  ViewWillEnter, AlertController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, optionsOutline, shareSocialOutline, copyOutline,
  giftOutline, peopleOutline, cashOutline, ticketOutline,
} from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { AppMenuService } from '../../shared/app-menu.service';
import { humanError } from '../../shared/errors';

/** Invite friends. Hidden behind the referral_enabled setting so the client
 *  can switch the whole programme on once he picks a reward amount. */
@Component({
  selector: 'app-user-refer',
  templateUrl: './refer.page.html',
  styleUrls: ['./refer.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    IonRefresher, IonRefresherContent,
  ],
})
export class UserReferPage implements ViewWillEnter {
  private appMenu = inject(AppMenuService);
  openMenu() { this.appMenu.open(); }

  enabled = false;
  reward = 0;
  code = '';
  invited = 0;
  earned = 0;

  enterCode = '';
  loading = true;
  busy = false;

  constructor(
    private data: DataService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      arrowBackOutline, optionsOutline, shareSocialOutline, copyOutline,
      giftOutline, peopleOutline, cashOutline, ticketOutline,
    });
  }

  ionViewWillEnter() { this.load(); }

  async load() {
    this.loading = true;
    try {
      const settings = await this.data.getSettings();
      this.enabled = settings['referral_enabled'] !== false;
      this.reward = Number(settings['referral_reward'] ?? 0);

      if (!this.enabled) return;

      const [code, stats] = await Promise.all([
        this.data.myReferralCode(),
        this.data.myReferralStats(),
      ]);
      this.code = code;
      this.invited = stats.invited;
      this.earned = stats.earned;
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  async refresh(ev: CustomEvent) {
    await this.load();
    (ev.target as HTMLIonRefresherElement).complete();
  }

  back() { this.router.navigate(['/user/home']); }

  private get inviteText() {
    return this.reward > 0
      ? `Join ShareOTT's and share OTT subscriptions cheaply. Use my code ${this.code} when you sign up. https://shareotts.app`
      : `Join ShareOTT's and share OTT subscriptions cheaply. Use my code ${this.code}. https://shareotts.app`;
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code);
      this.toast('Code copied');
    } catch {
      this.toast('Could not copy — long-press the code instead');
    }
  }

  /** Native share sheet where available, WhatsApp as the fallback. */
  async share() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "ShareOTT's", text: this.inviteText });
        return;
      } catch { /* user dismissed the sheet */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(this.inviteText)}`, '_system');
  }

  async redeem() {
    const c = this.enterCode.trim().toUpperCase();
    if (!c) { this.toast('Enter the code your friend gave you'); return; }

    this.busy = true;
    try {
      await this.data.redeemReferral(c);
      this.enterCode = '';
      await this.load();
      this.toast('Code applied. Thanks for joining!');
    } catch (e) {
      this.toast(humanError(e, 'That code did not work'));
    } finally {
      this.busy = false;
    }
  }

  async howItWorks() {
    const alert = await this.alertCtrl.create({
      header: 'How it works',
      message: this.reward > 0
        ? `1. Share your code with a friend.<br>` +
          `2. They enter it when they sign up.<br>` +
          `3. When they make their first purchase, you get ₹${this.reward}.`
        : `1. Share your code with a friend.<br>` +
          `2. They enter it when they sign up.<br>` +
          `3. Rewards are not switched on yet — invites are still counted.`,
      buttons: ['Got it'],
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
}
