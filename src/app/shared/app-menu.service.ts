import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController } from '@ionic/angular/standalone';
import { Auth } from '../auth';
import { AppMenuComponent } from './app-menu/app-menu.component';

/**
 * The options button in the top-right of every user screen.
 *
 * One place so the menu cannot drift between pages. Presents
 * AppMenuComponent as a bottom-sheet modal — every other screen in this app
 * is fully custom-styled, and a native ActionSheet was the one place still
 * wearing the OS's plain button list ("Make Menu sections look
 * professional").
 */
@Injectable({ providedIn: 'root' })
export class AppMenuService {
  private router = inject(Router);
  private auth = inject(Auth);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);

  async open() {
    const modal = await this.modalCtrl.create({
      component: AppMenuComponent,
      // A sheet sized to roughly fit the menu's own content (header + 9
      // rows) rather than the full screen, with room to drag further open
      // if a longer list is ever added.
      breakpoints: [0, 0.62, 1],
      initialBreakpoint: 0.62,
      handle: false,   // the component draws its own grab handle
      cssClass: 'am-modal',
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.action === 'go' && data.url) this.router.navigateByUrl(data.url);
    if (data?.action === 'logout') this.confirmLogout();
  }

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
