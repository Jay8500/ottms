import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonRefresher, IonRefresherContent,
  ViewWillEnter, AlertController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, personOutline, callOutline, mailOutline, calendarOutline,
  businessOutline, cardOutline, shieldOutline, cashOutline, checkmarkCircle,
  lockClosedOutline, saveOutline, createOutline, warningOutline, storefrontOutline,
} from 'ionicons/icons';
import { Auth } from '../../auth';
import { DataService } from '../../shared/data.service';
import { humanError } from '../../shared/errors';
import { AppUser } from '../../shared/models';

/**
 * Profile and payout details.
 *
 * Bank details are the gate on withdrawals — request_withdraw() refuses
 * without them, so this screen is the only way that flow becomes reachable.
 * First entry saves straight away; every later edit queues for admin (Q4).
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    IonRefresher, IonRefresherContent,
  ],
})
export class ProfilePage implements ViewWillEnter {
  me: AppUser | null = null;
  loading = true;
  saving = false;
  pendingChange = false;

  editing = false;
  form = { holderName: '', upiId: '', accountNo: '', ifsc: '' };

  constructor(
    private auth: Auth,
    private data: DataService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      arrowBackOutline, personOutline, callOutline, mailOutline, calendarOutline,
      businessOutline, cardOutline, shieldOutline, cashOutline, checkmarkCircle,
      lockClosedOutline, saveOutline, createOutline, warningOutline, storefrontOutline,
    });
  }

  ionViewWillEnter() { this.load(); }

  async load() {
    this.loading = true;
    try {
      const id = this.auth.currentUser?.id;
      if (!id) return;
      this.me = await this.data.getUser(id);
      this.pendingChange = await this.data.hasPendingBankChange();

      if (this.me?.bank) {
        this.form = {
          holderName: this.me.bank.holderName,
          upiId: this.me.bank.upiId,
          accountNo: this.me.bank.accountNo,
          ifsc: this.me.bank.ifsc,
        };
      } else {
        this.form.holderName = this.me?.name ?? '';
        this.editing = true;   // nothing on file — open the form immediately
      }
    } catch (e) {
      this.toast(humanError(e, 'Could not load your profile'));
    } finally {
      this.loading = false;
    }
  }

  async refresh(ev: CustomEvent) {
    await this.load();
    (ev.target as HTMLIonRefresherElement).complete();
  }

  back() { this.router.navigate(['/user/home']); }

  get hasBank() { return !!this.me?.bank; }

  private validate(): string | null {
    const f = this.form;
    if (!f.holderName.trim()) return 'Enter the account holder name';
    if (!f.upiId.trim() && !f.accountNo.trim()) {
      return 'Enter a UPI ID or a bank account number';
    }
    if (f.upiId.trim() && !f.upiId.includes('@')) {
      return 'That does not look like a UPI ID (name@bank)';
    }
    if (f.accountNo.trim() && !f.ifsc.trim()) {
      return 'IFSC code is needed with a bank account number';
    }
    return null;
  }

  async save() {
    const problem = this.validate();
    if (problem) { this.toast(problem); return; }

    this.saving = true;
    try {
      const payload = {
        holderName: this.form.holderName.trim(),
        upiId: this.form.upiId.trim() || undefined,
        accountNo: this.form.accountNo.trim() || undefined,
        ifsc: this.form.ifsc.trim() || undefined,
      };

      if (this.hasBank) {
        await this.data.requestBankChange(payload);
        this.pendingChange = true;
        this.toast('Change sent for approval. Your current details stay active until then.');
      } else {
        await this.data.saveBankDetails(payload);
        this.toast('Payout details saved — you can withdraw now');
      }

      this.editing = false;
      await this.load();
    } catch (e) {
      this.toast(humanError(e, 'Could not save'));
    } finally {
      this.saving = false;
    }
  }

  async startEdit() {
    if (this.pendingChange) {
      this.toast('You already have a change waiting for approval');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Change payout details?',
      message:
        'Your current details keep working until an admin approves the change. ' +
        'This protects your money if someone else gets into your account.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Continue', handler: () => { this.editing = true; } },
      ],
    });
    await alert.present();
  }

  cancelEdit() {
    this.editing = false;
    if (this.me?.bank) {
      this.form = {
        holderName: this.me.bank.holderName,
        upiId: this.me.bank.upiId,
        accountNo: this.me.bank.accountNo,
        ifsc: this.me.bank.ifsc,
      };
    }
  }

  async toggleSeller() {
    if (!this.me) return;
    try {
      await this.auth.toggleSellerMode(!this.me.isSeller);
      this.me.isSeller = !this.me.isSeller;
      this.toast(this.me.isSeller ? 'Seller mode on' : 'Seller mode off');
    } catch (e) {
      this.toast(humanError(e, 'Could not change seller mode'));
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 3000, position: 'bottom' });
    t.present();
  }
}
