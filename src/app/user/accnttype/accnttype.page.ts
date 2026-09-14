import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cartOutline, peopleOutline, arrowBackOutline, optionsOutline,
  cloudUploadOutline, calendarOutline, chatboxEllipsesOutline, closeOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { Auth } from '../../auth';
import { DataService } from '../../shared/data.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { humanError } from '../../shared/errors';
import { AppMenuService } from '../../shared/app-menu.service';
import { CommerceOption, OttApp, ValidityPlan } from '../../shared/models';

@Component({
  selector: 'app-accnttype',
  templateUrl: './accnttype.page.html',
  styleUrls: ['./accnttype.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, OttLogoComponent],
})
export class AccnttypePage implements OnInit {
  private appMenu = inject(AppMenuService);
  openMenu() { this.appMenu.open(); }

  ottId = '';
  app: OttApp | null = null;
  options: CommerceOption[] = [];
  validityPlans: ValidityPlan[] = [];
  loading = true;
  error = '';

  /** Create Group form — opens inline once Share is tapped. */
  showGroupForm = false;
  submitting = false;
  groupForm = { tierId: '', validityId: '', dateFrom: '', dateTo: '', proofName: '', comment: '' };
  private proofFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth,
    private data: DataService,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      cartOutline, peopleOutline, arrowBackOutline, optionsOutline,
      cloudUploadOutline, calendarOutline, chatboxEllipsesOutline, closeOutline,
      informationCircleOutline,
    });
  }

  async ngOnInit() { await this.enter(); }

  // Ionic reuses this page instance when the user goes back and picks a
  // different platform — same route, only the ?id= query param changes —
  // so ngOnInit does not run again. Reading route.snapshot only once meant
  // every platform after the first kept showing whichever loaded first.
  // Reported as "OTT Heading, Plans etc was showing Netflix only".
  ionViewWillEnter() { this.enter(); }

  private async enter() {
    const newId = this.route.snapshot.queryParamMap.get('id') ?? '';
    if (newId !== this.ottId) {
      this.ottId = newId;
      this.closeGroupForm();
    }
    await this.load();

    // Arriving from "Share a Screen" skips the Purchase/Share choice.
    if (this.route.snapshot.queryParamMap.get('share')) {
      const share = this.options.find(o => o.action === 'share');
      if (share) this.choose(share);
    }
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const [app, options, plans] = await Promise.all([
        this.data.getOttApp(this.ottId),
        this.data.getCommerceOptions(),
        this.data.getValidityPlans(),
      ]);
      this.app = app;
      this.options = options.filter(o => o.active);
      this.validityPlans = plans.filter(p => p.active).sort((a, b) => a.months - b.months);
      if (!app) this.error = 'That platform is no longer available.';
    } catch (e) {
      this.error = 'Could not load this platform.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Picking a validity fills in the dates for you, rather than asking the
   * seller to work out a date range by hand. Formats as YYYY-MM-DD, what
   * <input type="date"> and the server both expect.
   */
  pickValidity(p: ValidityPlan) {
    this.groupForm.validityId = p.id;
    const from = new Date();
    const to = new Date();
    to.setMonth(to.getMonth() + p.months);
    this.groupForm.dateFrom = from.toISOString().slice(0, 10);
    this.groupForm.dateTo = to.toISOString().slice(0, 10);
  }

  back() { this.router.navigate(['/user/ottplatforms']); }

  choose(o: CommerceOption) {
    if (o.action === 'share') {
      this.showGroupForm = true;
      // seed the tier so the form is valid with one tap when there is only one
      if (this.app?.tiers.length === 1) this.groupForm.tierId = this.app.tiers[0].id;
      return;
    }
    this.router.navigate(['/user/validity'], { queryParams: { id: this.ottId } });
  }

  closeGroupForm() {
    // Was hiding the panel but keeping every typed field, so reopening it
    // — even for a different platform — showed the last attempt's leftovers.
    // Reported as "content should be auto removed but it showing".
    this.showGroupForm = false;
    this.groupForm = { tierId: '', validityId: '', dateFrom: '', dateTo: '', proofName: '', comment: '' };
    this.proofFile = null;
  }

  onProof(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.toast('Screenshot must be under 5MB'); return; }
    this.proofFile = file;
    this.groupForm.proofName = file.name;
  }

  get seatsForTier() {
    return this.app?.tiers.find(t => t.id === this.groupForm.tierId)?.maxScreens ?? 0;
  }

  private validate(): string | null {
    const f = this.groupForm;
    if (!f.tierId)     return 'Choose which plan you are sharing';
    if (!f.validityId) return 'Choose how long the validity is';
    if (!this.proofFile) return 'Upload a screenshot of your subscription';
    return null;
  }

  async submitGroup() {
    const problem = this.validate();
    if (problem) { this.toast(problem); return; }

    this.submitting = true;
    try {
      // Storage upload lands with the buckets; the group row records the name
      // so admin can chase the seller if the proof is missing.
      await this.data.createGroup({
        ottAppId: this.ottId,
        tierId: this.groupForm.tierId,
        dateFrom: this.groupForm.dateFrom,
        dateTo: this.groupForm.dateTo,
        comment: this.groupForm.comment,
        proofName: this.groupForm.proofName,
        proofFile: this.proofFile ?? undefined,
      });

      this.toast('Group submitted for approval');
      this.showGroupForm = false;
      this.groupForm = { tierId: '', validityId: '', dateFrom: '', dateTo: '', proofName: '', comment: '' };
      this.proofFile = null;
    } catch (e: any) {
      // Test the raw error; humanError() has already replaced the text.
      const raw = String(e?.message ?? e);
      this.toast(
        /one_active_group|duplicate key/i.test(raw)
          ? `You already have an active ${this.app?.title} group`
          : humanError(e, 'Could not submit the group'),
      );
    } finally {
      this.submitting = false;
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2800, position: 'bottom' });
    t.present();
  }
}