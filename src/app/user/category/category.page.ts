import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, arrowBackOutline, optionsOutline, lockClosedOutline } from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { AppMenuService } from '../../shared/app-menu.service';
import { Category } from '../../shared/models';

@Component({
  selector: 'app-category',
  templateUrl: './category.page.html',
  styleUrls: ['./category.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonIcon],
})
export class CategoryPage implements OnInit {
  private appMenu = inject(AppMenuService);
  openMenu() { this.appMenu.open(); }

  categories: Category[] = [];
  loading = true;
  error = '';

  constructor(
    private router: Router,
    private data: DataService,
    private toastCtrl: ToastController,
  ) {
    addIcons({ chevronForwardOutline, arrowBackOutline, optionsOutline, lockClosedOutline });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.categories = await this.data.getCategories();
    } catch (e) {
      this.error = 'Could not load categories.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  back() { this.router.navigate(['/user/home']); }

  async openCategory(cat: Category) {
    if (!cat.active) {
      const t = await this.toastCtrl.create({
        message: `${cat.title} is coming soon`,
        duration: 1800, position: 'bottom',
      });
      t.present();
      return;
    }
    this.router.navigate(['/user/ottplatforms'], { queryParams: { cat: cat.id } });
  }
}