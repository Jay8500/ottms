import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonIcon,IonButton,IonSegmentButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-psymentaprpovals',
  templateUrl: './psymentaprpovals.page.html',
  styleUrls: ['./psymentaprpovals.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonIcon,IonButton,IonSegmentButton]
})
export class PsymentaprpovalsPage implements OnInit {
  activeFilter = 'pending';
 
  allPayments = [
    { id:'p1', userName:'Arjun (88)',  amount:149, ottName:'Netflix',  validity:'1M', date:'10 May 2026', status:'pending',  statusLabel:'Pending'  },
    { id:'p2', userName:'Deepa (201)', amount:399, ottName:'Hotstar',  validity:'3M', date:'11 May 2026', status:'pending',  statusLabel:'Pending'  },
    { id:'p3', userName:'Kavya (310)', amount:99,  ottName:'Prime',    validity:'1M', date:'09 May 2026', status:'approved', statusLabel:'Approved' },
    { id:'p4', userName:'Ravi (55)',   amount:749, ottName:'Netflix',  validity:'6M', date:'08 May 2026', status:'rejected', statusLabel:'Rejected' },
  ];
 
  filteredPayments: any[] = [];
  get pendingPayments() { return this.allPayments.filter(p => p.status === 'pending'); }
 
  constructor(private alertCtrl: AlertController, private toastCtrl: ToastController) {}
  ngOnInit() { this.filterPayments(); }
 
  filterPayments() { this.filteredPayments = this.allPayments.filter(p => p.status === this.activeFilter); }
 
  async approve(p: any) {
    p.status = 'approved'; p.statusLabel = 'Approved';
    this.filterPayments();
    // TODO: API call to credit wallet + notify user
    const t = await this.toastCtrl.create({ message: `₹${p.amount} credited to ${p.userName}`, duration: 2500, position: 'bottom', color: 'success' });
    t.present();
  }
 
  async reject(p: any) {
    const alert = await this.alertCtrl.create({
      header: 'Reject Payment',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Reason...' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Reject', role: 'destructive', handler: () => { p.status = 'rejected'; p.statusLabel = 'Rejected'; this.filterPayments(); } },
      ],
    });
    await alert.present();
  }
 
  viewScreenshot(p: any) { /* TODO: open image modal */ }
}
 
