import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, optionsOutline, informationCircleOutline } from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { AppMenuService } from '../../shared/app-menu.service';
import { OttApp } from '../../shared/models';

/**
 * "Share a screen" entry point — pick a platform, then continue into the
 * Create Group form on the account-type page. The form lives in one place
 * rather than being duplicated here.
 */
@Component({
  selector: 'app-creategroup',
  templateUrl: './creategroup.page.html',
  styleUrls: ['./creategroup.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonIcon, OttLogoComponent],
})
export class CreategroupPage implements OnInit {
  private appMenu = inject(AppMenuService);
  openMenu() { this.appMenu.open(); }

  apps: OttApp[] = [];
  loading = true;
  error = '';

  constructor(private router: Router, private data: DataService) {
    addIcons({ arrowBackOutline, optionsOutline, informationCircleOutline });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.apps = (await this.data.getOttApps()).filter(a => a.active);
    } catch (e) {
      this.error = 'Could not load platforms.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  back() { this.router.navigate(['/user/home']); }

  pick(app: OttApp) {
    this.router.navigate(['/user/accnttype'], { queryParams: { id: app.id, share: 1 } });
  }
}