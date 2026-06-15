import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonIcon,IonButton ,IonSegmentButton,
  IonBadge
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-groupapprovals',
  templateUrl: './groupapprovals.page.html',
  styleUrls: ['./groupapprovals.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonIcon,IonButton,IonSegmentButton,
    IonBadge,
  ]
})
export class GroupapprovalsPage implements OnInit {
  activeFilter = 'pending';
 
  allGroups = [
    { id:'g1', ottName:'Netflix',  initial:'N', color:'#e50914', validity:'1 Month',  sellerName:'Meera (58)',  plan:'HD',    price:149, screens:2, status:'pending',  statusLabel:'Pending',  screenshotUrl:'dummy.jpg' },
    { id:'g2', ottName:'Hotstar',  initial:'H', color:'#1565c0', validity:'3 Months', sellerName:'Rajan (91)',  plan:'HD',    price:399, screens:1, status:'pending',  statusLabel:'Pending',  screenshotUrl:'dummy.jpg' },
    { id:'g3', ottName:'Prime',    initial:'P', color:'#00a8e0', validity:'1 Month',  sellerName:'Arjun (88)', plan:'Full HD',price:99,  screens:3, status:'approved', statusLabel:'Approved', screenshotUrl:'dummy.jpg' },
  ];
 
  filteredGroups = [...this.allGroups];
  get pendingCount() { return this.allGroups.filter(g => g.status === 'pending').length; }
 
  constructor(private alertCtrl: AlertController, private toastCtrl: ToastController) {}
  ngOnInit() { this.filterGroups(); }
 
  filterGroups() { this.filteredGroups = this.allGroups.filter(g => g.status === this.activeFilter); }
 
  async approve(g: any) {
    g.status = 'approved'; g.statusLabel = 'Approved';
    this.filterGroups();
    // TODO: API call
    const t = await this.toastCtrl.create({ message: `${g.ottName} group approved!`, duration: 2000, position: 'bottom', color: 'success' });
    t.present();
  }
 
  async reject(g: any) {
    const alert = await this.alertCtrl.create({
      header: 'Reject Group',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Reason for rejection...' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Reject', role: 'destructive', handler: data => {
          g.status = 'rejected'; g.statusLabel = 'Rejected';
          this.filterGroups(); // TODO: send rejection reason via API
        }},
      ],
    });
    await alert.present();
  }
 
  viewProof(g: any) { /* TODO: open modal with screenshot image */ }
}
