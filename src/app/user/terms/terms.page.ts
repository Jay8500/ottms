import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, optionsOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { AppMenuService } from '../../shared/app-menu.service';

/** Terms & Conditions, edited by admin in tile 18. */
@Component({
  selector: 'app-user-terms',
  templateUrl: './terms.page.html',
  styleUrls: ['./terms.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class UserTermsPage implements OnInit {
  private appMenu = inject(AppMenuService);
  openMenu() { this.appMenu.open(); }

  lines: string[] = [];
  loading = true;
  error = '';

  constructor(private router: Router, private data: DataService) {
    addIcons({ arrowBackOutline, optionsOutline, shieldCheckmarkOutline });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const body = await this.data.getTerms();
      this.lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    } catch (e) {
      this.error = 'Could not load the terms.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  back() { this.router.navigate(['/user/home']); }
}
