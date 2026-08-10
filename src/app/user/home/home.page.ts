import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline, notificationsOutline, arrowForwardOutline, cartOutline,
  headsetOutline, addCircleOutline, walletOutline, settingsOutline,
  optionsOutline, pricetagOutline, giftOutline, helpCircleOutline,
  chatbubblesOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { Auth } from '../../auth';
import { DataService } from '../../shared/data.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { AppMenuService } from '../../shared/app-menu.service';
import { HomeButton, OttApp } from '../../shared/models';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonIcon, OttLogoComponent],
})
export class HomePage implements OnInit, OnDestroy {
  private appMenu = inject(AppMenuService);
  openMenu() { this.appMenu.open(); }

  @ViewChild(IonContent) content!: IonContent;

  userName = '';
  uniqueNumber = 0;
  isSeller = false;

  buttons: HomeButton[] = [];
  ottApps: OttApp[] = [];
  loading = true;
  error = '';

  private sub?: Subscription;

  constructor(
    private auth: Auth,
    private data: DataService,
    private router: Router,
  ) {
    addIcons({
      logOutOutline, notificationsOutline, arrowForwardOutline, cartOutline,
      headsetOutline, addCircleOutline, walletOutline, settingsOutline,
      optionsOutline, pricetagOutline, giftOutline, helpCircleOutline,
      chatbubblesOutline,
    });
  }

  ngOnInit() {
    this.sub = this.auth.user$.subscribe((u) => {
      if (!u) return;
      this.userName = u.name || 'User';
      this.uniqueNumber = u.uniqueNumber || 0;
      this.isSeller = u.isSeller;
    });
    this.load();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  private async load() {
    this.loading = true;
    this.error = '';
    try {
      const [buttons, apps] = await Promise.all([
        this.data.getHomeButtons(),
        this.data.getOttApps(),
      ]);
      this.buttons = buttons.filter(b => b.active);
      this.ottApps = apps.filter(a => a.active);
    } catch (e: any) {
      this.error = 'Could not load. Pull down to retry.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  ionViewDidEnter() { this.content?.scrollToTop(0); }

  tapButton(b: HomeButton) { this.router.navigate([b.route]); }

  selectApp(app: OttApp) {
    this.router.navigate(['/user/accnttype'], { queryParams: { id: app.id } });
  }

  retry() { this.load(); }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}