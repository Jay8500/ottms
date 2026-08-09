import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, optionsOutline, starOutline, star,
  shieldCheckmarkOutline, flashOutline, closeOutline,
} from 'ionicons/icons';
import { Auth } from '../../auth';
import { DataService } from '../../shared/data.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { humanError } from '../../shared/errors';
import { GroupScreen, OttApp, ValidityPlan } from '../../shared/models';

type SortKey = 'all' | 'stars' | 'batch' | 'verified';

@Component({
  selector: 'app-sellerslist',
  templateUrl: './sellerslist.page.html',
  styleUrls: ['./sellerslist.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonIcon, OttLogoComponent],
})
export class SellerslistPage implements OnInit {
  ottId = '';
  months = 0;
  app: OttApp | null = null;
  plan: ValidityPlan | null = null;

  sort: SortKey = 'all';
  private all: GroupScreen[] = [];
  shown: GroupScreen[] = [];

  loading = true;
  error = '';

  // Purchase sheet
  picked: GroupScreen | null = null;
  available = 0;
  buying = false;

  readonly sorts: { key: SortKey; label: string; icon?: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'stars',    label: 'Stars',    icon: 'star-outline' },
    { key: 'batch',    label: 'Batch',    icon: 'flash-outline' },
    { key: 'verified', label: 'Verified', icon: 'shield-checkmark-outline' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth,
    private data: DataService,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      arrowBackOutline, optionsOutline, starOutline, star,
      shieldCheckmarkOutline, flashOutline, closeOutline,
    });
  }

  async ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    this.ottId = q.get('id') ?? '';
    this.months = Number(q.get('months') ?? 0);
    const validityId = q.get('validity');

    await this.load(validityId);
  }

  async load(validityId?: string | null) {
    this.loading = true;
    this.error = '';
    try {
      const [app, plans, groups] = await Promise.all([
        this.data.getOttApp(this.ottId),
        this.data.getValidityPlans(),
        this.data.getGroups(),
      ]);

      this.app = app;
      this.plan = plans.find(p => p.id === validityId) ?? plans.find(p => p.months === this.months) ?? null;
      if (this.plan) this.months = this.plan.months;

      // Only live listings for this platform and duration that still have room.
      this.all = groups.filter(g =>
        g.ottId === this.ottId
        && g.status === 'approved'
        && (!this.months || g.months === this.months)
        && g.seatsFilled < g.seatsTotal);

      this.applySort();
    } catch (e) {
      this.error = 'Could not load sellers.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  applySort() {
    const list = [...this.all];
    if (this.sort === 'stars')    list.sort((a, b) => b.seatsTotal - a.seatsTotal);
    if (this.sort === 'batch')    list.sort((a, b) => a.price - b.price);
    if (this.sort === 'verified') list.sort((a, b) => b.seatsFilled - a.seatsFilled);
    this.shown = list;
  }

  setSort(k: SortKey) { this.sort = k; this.applySort(); }

  back() { this.router.navigate(['/user/validity'], { queryParams: { id: this.ottId } }); }

  /** Opens the balance-vs-price sheet rather than jumping to payment. */
  open(g: GroupScreen) {
    this.picked = g;
    this.available = this.auth.currentUser?.unlockedAmount ?? 0;
  }

  close() { this.picked = null; }

  get shortfall() {
    if (!this.picked) return 0;
    return Math.max(0, this.picked.price - this.available);
  }

  async purchase() {
    if (!this.picked) return;

    this.buying = true;
    try {
      await this.data.purchaseScreen(this.picked.id);
      await this.auth.refresh();
      this.toast('Purchased. The seller will share credentials in chat.');
      this.picked = null;
      this.router.navigate(['/user/wallet']);
    } catch (e: any) {
      // Branch on the raw error — humanError() has already rewritten the text,
      // so the machine-readable codes are gone by then.
      const raw = String(e?.message ?? e);

      if (/INSUFFICIENT_FUNDS/.test(raw)) {
        this.toast('Not enough balance — add funds first');
        this.goWallet();
      } else if (/is full/i.test(raw)) {
        this.toast('That group just filled up');
        this.picked = null;
        await this.load();
      } else {
        this.toast(humanError(e, 'Could not complete the purchase'));
      }
    } finally {
      this.buying = false;
    }
  }

  goWallet() {
    this.picked = null;
    this.router.navigate(['/user/payment'], { queryParams: { mode: 'addFund' } });
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2800, position: 'bottom' });
    t.present();
  }
}