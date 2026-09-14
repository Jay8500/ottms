import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, personOutline, walletOutline, businessOutline, peopleOutline,
  receiptOutline, giftOutline, headsetOutline, documentTextOutline, logOutOutline,
} from 'ionicons/icons';
import { Auth } from '../../auth';

interface MenuRow {
  text: string;
  icon: string;
  url?: string;
  danger?: boolean;
}

/**
 * The options menu, as a real component rather than a native ActionSheet.
 * The rest of the app is fully custom-styled; this was the one screen still
 * wearing the OS's default button list. Same rows, same order — just given
 * the same visual care as everywhere else: a profile header, icon chips,
 * grouped sections, logout set apart in red.
 */
@Component({
  selector: 'app-menu-sheet',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="am-sheet">
      <div class="am-grab"></div>

      <div class="am-head">
        <div class="am-av">{{ (auth.currentUser?.name ?? 'U').charAt(0) }}</div>
        <div class="am-who">
          <p class="am-name">{{ auth.currentUser?.name ?? 'Menu' }}</p>
          <p class="am-id" *ngIf="auth.currentUser">User ID {{ auth.currentUser.uniqueNumber }}</p>
        </div>
        <button class="am-close" (click)="dismiss()" aria-label="Close">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>

      <div class="am-rows">
        <button class="am-row" *ngFor="let r of rows" (click)="go(r.url)">
          <span class="am-ico"><ion-icon [name]="r.icon"></ion-icon></span>
          <span class="am-text">{{ r.text }}</span>
        </button>
      </div>

      <div class="am-rows">
        <button class="am-row danger" (click)="logout()">
          <span class="am-ico"><ion-icon name="log-out-outline"></ion-icon></span>
          <span class="am-text">Logout</span>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./app-menu.component.scss'],
})
export class AppMenuComponent {
  auth = inject(Auth);
  private modalCtrl = inject(ModalController);

  readonly rows: MenuRow[] = [
    { text: 'Profile',            icon: 'person-outline',        url: '/user/profile' },
    { text: 'Payments & Wallet',  icon: 'wallet-outline',        url: '/user/wallet' },
    { text: 'Bank Details',       icon: 'business-outline',      url: '/user/profile' },
    { text: 'My Groups',          icon: 'people-outline',        url: '/user/groups' },
    { text: 'Order History',      icon: 'receipt-outline',       url: '/user/wallet' },
    { text: 'Invite Friends',     icon: 'gift-outline',          url: '/user/refer' },
    { text: 'Support',            icon: 'headset-outline',       url: '/user/support' },
    { text: 'Terms & Conditions', icon: 'document-text-outline', url: '/user/terms' },
  ];

  constructor() {
    addIcons({
      closeOutline, personOutline, walletOutline, businessOutline, peopleOutline,
      receiptOutline, giftOutline, headsetOutline, documentTextOutline, logOutOutline,
    });
  }

  dismiss() { this.modalCtrl.dismiss(); }

  go(url?: string) {
    this.modalCtrl.dismiss({ action: 'go', url });
  }

  logout() {
    this.modalCtrl.dismiss({ action: 'logout' });
  }
}
