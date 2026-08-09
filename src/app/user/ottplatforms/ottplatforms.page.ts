import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, arrowBackOutline, optionsOutline } from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { Category, OttApp } from '../../shared/models';

@Component({
  selector: 'app-ottplatforms',
  templateUrl: './ottplatforms.page.html',
  styleUrls: ['./ottplatforms.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, OttLogoComponent],
})
export class OttplatformsPage implements OnInit {
  categoryId = '';
  categoryName = '';
  categoryColor = '#F9D54B';
  categoryIcon = 'film-outline';

  searchTerm = '';
  all: OttApp[] = [];
  filtered: OttApp[] = [];
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data: DataService,
  ) {
    addIcons({ searchOutline, arrowBackOutline, optionsOutline });
  }

  async ngOnInit() {
    this.categoryId = this.route.snapshot.queryParamMap.get('cat') ?? '';
    await this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const cats: Category[] = await this.data.getCategories();
      const cat = cats.find(c => c.id === this.categoryId) ?? cats.find(c => c.active);
      if (cat) {
        this.categoryId = cat.id;
        this.categoryName = cat.title;
        this.categoryColor = cat.color;
        this.categoryIcon = cat.icon;
      }

      this.all = (await this.data.getOttApps(this.categoryId)).filter(a => a.active);
      this.filter();
    } catch (e) {
      this.error = 'Could not load platforms.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  filter() {
    const t = this.searchTerm.trim().toLowerCase();
    this.filtered = !t ? [...this.all] : this.all.filter(a => a.title.toLowerCase().includes(t));
  }

  back() { this.router.navigate(['/user/category']); }

  selectApp(app: OttApp) {
    this.router.navigate(['/user/accnttype'], { queryParams: { id: app.id } });
  }
}