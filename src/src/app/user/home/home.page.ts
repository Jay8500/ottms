import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../auth';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { logOutOutline } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  notificationsOutline,
  arrowForwardOutline,
  cartOutline,
  headsetOutline,
  addCircleOutline,
  walletOutline,
  settingsOutline,
  optionsOutline,
  pricetagOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonIcon],
})
export class HomePage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;

  userName = '';
  uniqueNumber = 0;
  initials = '';
  isSeller = false;
  sellerToggle = false;

  offers = [
    {
      id: 1,
      title: 'Netflix + Prime Combo',
      description: 'Save ₹120/month on bundled screens',
    },
    {
      id: 2,
      title: 'Hotstar Sports Pack',
      description: '3 months at ₹349 only',
    },
    { id: 3, title: 'Spotify Premium', description: '6 months share at ₹199' },
  ];

  ottApps = [
    { id: 'netflix', name: 'Netflix', initial: 'N', color: '#e50914' },
    { id: 'prime', name: 'Prime', initial: 'P', color: '#00a8e0' },
    { id: 'hotstar', name: 'Hotstar', initial: 'H', color: '#1565c0' },
    { id: 'sony', name: 'SonyLIV', initial: 'S', color: '#e91e63' },
    { id: 'spotify', name: 'Spotify', initial: 'S', color: '#1db954' },
    { id: 'zee5', name: 'ZEE5', initial: 'Z', color: '#8e24aa' },
  ];

  constructor(private auth: Auth, private router: Router) {
    addIcons({
      notificationsOutline,
      arrowForwardOutline,
      cartOutline,
      headsetOutline,
      addCircleOutline,
      walletOutline,
      logOutOutline,
      settingsOutline,
      optionsOutline,
      pricetagOutline,
    });
  }

  ngOnInit() {
    this.auth.user$.subscribe((u) => {
      if (!u) return;
      this.userName = u.name || 'User';
      this.uniqueNumber = u.uniqueNumber || 0;
      this.initials = u.name ? u.name.substring(0, 2).toUpperCase() : 'UU';
      this.isSeller = u.isSeller;
      this.sellerToggle = u.isSeller;
      console.log('isSeller updated:', this.isSeller); // debug
    });
  }

  ionViewDidEnter() {
    this.content?.scrollToTop(0);
  }

  selectApp(app: any) {
    this.router.navigate(['/user/accnttype'], { queryParams: { id: app.id } });
  }
  openOffer(offer: any) {
    this.router.navigate(['/user/category']);
  }
  goCategory() {
    console.log('CLICKED!');
    this.router.navigate(['/user/category']);
  }
  goSupport() {
    this.router.navigate(['/user/support']);
  }
  goWallet() {
    this.router.navigate(['/user/wallet']);
  }
  goCreateGroup() {
    this.router.navigate(['/user/creategroup']);
  }

  openNotifications() {
    this.router.navigate(['/user/wallet']);
    // points to wallet for now — TODO: real notifications
  }

  goFilter() {
    // TODO: open filter/sort options sheet
  }

  toggleSeller(event: any) {
    if (event?.detail) {
      this.auth.toggleSellerMode(event.detail.checked);
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
