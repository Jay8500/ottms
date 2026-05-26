import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../auth';
 
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonIcon, 
  IonButton, 
  IonButtons, 
  IonToggle ,
  
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  notificationsOutline, 
  arrowForwardOutline, 
  cartOutline, 
  headsetOutline, 
  addCircleOutline, 
  walletOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonHeader, 
    IonToolbar, 
    CommonModule, 
    FormsModule, 
    IonIcon, 
    IonButton, 
    IonButtons, 
    IonToggle
  ]
})
export class HomePage implements OnInit {
  userName = '';
  uniqueNumber = 0;
  initials = '';
  isSeller = false;
  sellerToggle = false;
 
  // ── Dummy data ──────────────────────────────────────────────────────────
  offers = [
    { id: 1, title: 'Netflix + Prime Combo', description: 'Save ₹120/month on bundled screens' },
    { id: 2, title: 'Hotstar Sports Pack',   description: '3 months at ₹349 only' },
    { id: 3, title: 'Spotify Premium',       description: '6 months share at ₹199' },
    { id: 4, title: 'Spotify Premium',       description: '6 months share at ₹199' },
    { id: 5, title: 'Spotify Premium',       description: '6 months share at ₹199' },
    { id: 6, title: 'Spotify Premium',       description: '6 months share at ₹199' },
    { id: 7, title: 'Spotify Premium',       description: '6 months share at ₹199' },
    { id: 8, title: 'Spotify Premium',       description: '6 months share at ₹199' },
    { id: 9, title: 'Spotify Premium',       description: '6 months share at ₹199' },
    { id: 10, title: 'Spotify Premium',      description: '6 months share at ₹199' },
    { id: 11, title: 'Spotify Premium',      description: '6 months share at ₹199' },
  ];
 
  ottApps = [
    { id: 'netflix',  name: 'Netflix',  initial: 'N', color: '#e50914' },
    { id: 'prime',    name: 'Prime',    initial: 'P', color: '#00a8e0' },
    { id: 'hotstar',  name: 'Hotstar',  initial: 'H', color: '#1565c0' },
    { id: 'sony',     name: 'SonyLIV', initial: 'S', color: '#e91e63' },
    { id: 'spotify',  name: 'Spotify',  initial: 'M', color: '#1db954' },
    { id: 'zee5',     name: 'ZEE5',     initial: 'Z', color: '#8e24aa' },
  ];
 
  constructor(private auth: Auth, private router: Router) {
    // Register icons explicitly so the standalone framework prints them perfectly
    addIcons({
      'notifications-outline': notificationsOutline,
      'arrow-forward-outline': arrowForwardOutline,
      'cart-outline': cartOutline,
      'headset-outline': headsetOutline,
      'add-circle-outline': addCircleOutline,
      'wallet-outline': walletOutline
    });
  }
 
  ngOnInit() {
    this.auth.user$.subscribe(u => {
      if (!u) return;
      this.userName     = u.name || 'User';
      this.uniqueNumber = u.uniqueNumber || 0;
      this.initials     = u.name ? u.name.substring(0, 2).toUpperCase() : 'UU';
      this.isSeller     = u.isSeller;
      this.sellerToggle = u.isSeller;
    });
  }
 
  selectApp(app: any)   { this.router.navigate(['/user/account-type', app.id]); }
  openOffer(offer: any) { this.router.navigate(['/user/category']); }
  goCategory()          { this.router.navigate(['/user/category']); }
  goSupport()           { this.router.navigate(['/user/support']); }
  goWallet()            { this.router.navigate(['/user/wallet']); }
  goCreateGroup()       { this.router.navigate(['/user/seller-group']); }
  openNotifications()   { /* TODO */ }
 
  toggleSeller(event: any) {
    if (event && event.detail) {
      const val = event.detail.checked;
      this.auth.toggleSellerMode(val);
    }
  }
}