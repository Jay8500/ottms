import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController } from '@ionic/angular/standalone';
import { Auth } from '../auth';

/**
 * The options button in the top-right of every user screen.
 *
 * One place so the menu cannot drift between pages — it was previously
 * rendered on every screen and wired to nothing.
 */
@Injectable({ providedIn: 'root' })
export class AppMenuService {
  private router = inject(Router);
  private auth = inject(Auth);
  private sheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);

  async open() {
    const sheet = await this.sheetCtrl.create({
      header: this.auth.currentUser?.name ?? 'Menu',
      subHeader: this.auth.currentUser
        ? `User ID ${this.auth.currentUser.uniqueNumber}`
        : undefined,
      buttons: [
        { text: 'Profile',            icon: 'person-outline',      handler: () => this.go('/user/profile') },
        { text: 'Payments & Wallet',  icon: 'wallet-outline',      handler: () => this.go('/user/wallet') },
        { text: 'Bank Details',       icon: 'business-outline',    handler: () => this.go('/user/profile') },
        { text: 'My Groups',          icon: 'people-outline',      handler: () => this.go('/user/groups') },
        { text: 'Order History',      icon: 'receipt-outline',     handler: () => this.go('/user/wallet') },
        { text: 'Invite Friends',     icon: 'gift-outline',        handler: () => this.go('/user/refer') },
        { text: 'Support',            icon: 'headset-outline',     handler: () => this.go('/user/support') },
        { text: 'Terms & Conditions', icon: 'document-text-outline', handler: () => this.go('/user/terms') },
        { text: 'Logout',             icon: 'log-out-outline', role: 'destructive',
          handler: () => { this.confirmLogout(); } },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private go(url: string) { this.router.navigateByUrl(url); }

  private async confirmLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Log out?',
      message: 'You will need your mobile number and password to sign back in.',
      buttons: [
        { text: 'Stay', role: 'cancel' },
        {
          text: 'Log out', role: 'destructive',
          handler: async () => {
            await this.auth.logout();
            this.router.navigate(['/login'], { replaceUrl: true });
          },
        },
      ],
    });
    await alert.present();
  }
}
