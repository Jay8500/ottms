import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController } from '@ionic/angular/standalone';
import { Auth } from '../../auth';
import { addIcons } from 'ionicons';
import {
  arrowUpCircleOutline, addCircleOutline, lockClosedOutline, lockOpenOutline,
  walletOutline, chatbubbleOutline, settingsOutline, optionsOutline, arrowBackOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon]
})
export class WalletPage implements OnInit {
  totalAmount    = 1240;
  lockedAmount   = 840;
  unlockedAmount = 400;
  activeTab      = 'all';

  // txType: 'funded' = amount added / OTT sold, 'expense' = withdraw / purchased OTT
  allScreens = [
    { id:'sc1', ottName:'Netflix', validity:'1M', txType:'expense', dateFrom:'01 May 2026', dateTo:'31 May 2026', txDate:'01 May 2026, 10:00 AM', status:'active',    statusLabel:'Active',    color:'#e50914', initial:'N', amount:149 },
    { id:'sc2', ottName:'Prime',   validity:'3M', txType:'funded',  dateFrom:'28 Apr 2026', dateTo:'28 Jul 2026', txDate:'28 Apr 2026, 03:00 PM', status:'completed', statusLabel:'Completed', color:'#00a8e0', initial:'P', amount:99  },
    { id:'sc3', ottName:'Hotstar', validity:'1M', txType:'expense', dateFrom:'10 May 2026', dateTo:'10 Jun 2026', txDate:'10 May 2026, 09:30 AM', status:'pending',   statusLabel:'Pending',   color:'#1565c0', initial:'H', amount:399 },
  ];

  displayScreens: any[] = [];

  constructor(
    private router: Router,
    private auth: Auth,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      arrowUpCircleOutline, addCircleOutline, lockClosedOutline, lockOpenOutline,
      walletOutline, chatbubbleOutline, settingsOutline, optionsOutline, arrowBackOutline
    });
  }

  ngOnInit() {
    const u = this.auth.currentUser;
    if (u) {
      this.totalAmount    = u.walletAmount;
      this.lockedAmount   = u.lockedAmount;
      this.unlockedAmount = u.unlockedAmount;
    }
    this.applyFilter();
  }

  applyFilter() {
    if (this.activeTab === 'all')     this.displayScreens = [...this.allScreens];
    else if (this.activeTab === 'funded')  this.displayScreens = this.allScreens.filter(s => s.txType === 'funded');
    else if (this.activeTab === 'expense') this.displayScreens = this.allScreens.filter(s => s.txType === 'expense');
  }

  addFund() {
    // Navigate to payment page for adding funds
    this.router.navigate(['/user/payment'], { queryParams: { mode: 'addFund' } });
  }

  async withdraw() {
    const alert = await this.alertCtrl.create({
      header: '💸 Withdraw Amount',
      subHeader: `Available: ₹${this.unlockedAmount}`,
      cssClass: 'withdraw-alert',
      inputs: [
        { name: 'amount',   type: 'number', placeholder: 'Amount to Withdraw (₹)' },
        { name: 'method',   type: 'radio',  label: '📱 UPI Transfer', value: 'upi',  checked: true },
        { name: 'method',   type: 'radio',  label: '🏦 Bank Transfer', value: 'bank' },
        { name: 'upiId',    type: 'text',   placeholder: 'UPI ID (e.g. name@upi)' },
        { name: 'mobile',   type: 'tel',    placeholder: 'Registered Mobile Number' },
        { name: 'accName',  type: 'text',   placeholder: 'Account Holder Name' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel', cssClass: 'cancel-btn' },
        {
          text: '✅ Submit Request',
          cssClass: 'submit-btn',
          handler: async (data) => {
            if (!data.amount) {
              this.showToast('Please enter amount'); return false;
            }
            if (data.amount > this.unlockedAmount) {
              this.showToast('Amount exceeds unlocked balance'); return false;
            }
            // TODO: Supabase — submit withdraw request
            this.showToast('Withdraw request submitted! Pending for Admin Approval. 🎉');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 3000, position: 'bottom' });
    t.present();
  }

  openChat(s: any) { this.router.navigate(['/user/chat'], { queryParams: { screenId: s.id } }); }
}
