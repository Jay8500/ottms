import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-walletadmin',
  templateUrl: './walletadmin.page.html',
  styleUrls: ['./walletadmin.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonButton]
})
export class WalletadminPage implements OnInit {
  searchTerm = '';
 
  allWallets = [
    { id:'u1', name:'Bharath', uid:322, total:'1,240', locked:'840',   unlocked:'400',   role:'Buyer',  screens:['Netflix 1M', 'Hotstar 3M'] },
    { id:'u2', name:'Meera',   uid:58,  total:'3,800', locked:'1,400', unlocked:'2,400', role:'Seller', screens:['Prime 1M Sold', 'ZEE5 1M Sold'] },
    { id:'u3', name:'Arjun',   uid:88,  total:'540',   locked:'540',   unlocked:'0',     role:'Buyer',  screens:['Netflix 1M Active'] },
    { id:'u4', name:'Rajan',   uid:91,  total:'2,100', locked:'700',   unlocked:'1,400', role:'Seller', screens:['Hotstar 3M Sold'] },
  ];
 
  filteredWallets = [...this.allWallets];
 
  constructor(private alertCtrl: AlertController) {}
  ngOnInit() {}
 
  filterWallets() {
    const t = this.searchTerm.toLowerCase();
    this.filteredWallets = !t ? [...this.allWallets] : this.allWallets.filter(w =>
      w.name.toLowerCase().includes(t) || String(w.uid).includes(t)
    );
  }
 
  async editWallet(w: any) {
    const alert = await this.alertCtrl.create({
      header: `Edit Wallet — ${w.name}`,
      inputs: [
        { name: 'total',    type: 'number', value: w.total.replace(',',''),    placeholder: 'Total Amount'    },
        { name: 'locked',   type: 'number', value: w.locked.replace(',',''),   placeholder: 'Locked Amount'   },
        { name: 'unlocked', type: 'number', value: w.unlocked.replace(',',''), placeholder: 'Unlocked Amount' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Save', handler: data => {
          w.total = data.total; w.locked = data.locked; w.unlocked = data.unlocked;
          // TODO: API call to update wallet
        }},
      ],
    });
    await alert.present();
  }
}