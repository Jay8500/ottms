import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, arrowBackOutline, optionsOutline, chevronForwardOutline } from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { OttApp, ValidityPlan } from '../../shared/models';

@Component({
  selector: 'app-validity',
  templateUrl: './validity.page.html',
  styleUrls: ['./validity.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonIcon, OttLogoComponent],
})
export class ValidityPage implements OnInit {
  ottId = '';
  app: OttApp | null = null;
  plans: ValidityPlan[] = [];
  selectedId: string | null = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data: DataService,
  ) {
    addIcons({ calendarOutline, arrowBackOutline, optionsOutline, chevronForwardOutline });
  }

  async ngOnInit() {
    this.ottId = this.route.snapshot.queryParamMap.get('id') ?? '';
    await this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const [app, plans] = await Promise.all([
        this.data.getOttApp(this.ottId),
        this.data.getValidityPlans(),
      ]);
      this.app = app;
      this.plans = plans.filter(p => p.active);
    } catch (e) {
      this.error = 'Could not load plans.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  back() { this.router.navigate(['/user/accnttype'], { queryParams: { id: this.ottId } }); }

  /** Tapping a plan goes straight through — no second confirm step. */
  select(v: ValidityPlan) {
    this.selectedId = v.id;
    this.router.navigate(['/user/sellerslist'], {
      queryParams: { id: this.ottId, validity: v.id, months: v.months },
    });
  }
}