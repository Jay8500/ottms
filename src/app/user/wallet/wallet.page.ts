import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonSegment, IonSegmentButton, IonIcon,
  AlertController
} from '@ionic/angular/standalone';
import { Auth } from '../../auth';
import { addIcons } from 'ionicons';
import { arrowUpCircleOutline, arrowUpOutline, lockClosedOutline, lockOpenOutline, walletOutline, chatbubbleOutline, starOutline } from 'ionicons/icons';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.page.html',
  styleUrls: ['./wallet.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonSegment, IonSegmentButton, IonIcon
  ]
})
export class WalletPage implements OnInit {
  totalAmount    = 1240;
  lockedAmount   = 840;
  unlockedAmount = 400;
  activeTab      = 'all';

  allScreens = [
    { id:'sc1', ottName:'Netflix', validity:'1M', type:'purchased', peer:'Rahul (104)',  date:'01 May 2026', status:'active',    statusLabel:'Active',    color:'#e50914', initial:'N', rated:false },
    { id:'sc2', ottName:'Prime',   validity:'3M', type:'sold',      peer:'Meera (58)',   date:'28 Apr 2026', status:'completed', statusLabel:'Completed', color:'#00a8e0', initial:'P', rated:true  },
    { id:'sc3', ottName:'Hotstar', validity:'1M', type:'purchased', peer:'Arjun (88)',   date:'10 May 2026', status:'pending',   statusLabel:'Pending',   color:'#1565c0', initial:'H', rated:false },
  ];

  displayScreens: any[] = [];

  constructor(private router: Router, private auth: Auth, private alertCtrl: AlertController) {
    addIcons({ arrowUpCircleOutline, arrowUpOutline, lockClosedOutline, lockOpenOutline, walletOutline, chatbubbleOutline, starOutline });
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
    this.displayScreens = this.activeTab === 'all'
      ? [...this.allScreens]
      : this.allScreens.filter(s => s.type === this.activeTab);
  }

  openChat(s: any)   { this.router.navigate(['/user/chat'],   { queryParams: { screenId: s.id } }); }
  openRating(s: any) { this.router.navigate(['/user/rating'], { queryParams: { screenId: s.id } }); }

  async withdraw() {
    const alert = await this.alertCtrl.create({
      header: 'Withdraw',
      message: `Withdraw ₹${this.unlockedAmount} to your UPI/bank?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Withdraw', handler: () => { /* TODO: API */ } }
      ]
    });
    await alert.present();
  }
}
