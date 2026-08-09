import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cartOutline, peopleOutline, arrowBackOutline, optionsOutline,
  cloudUploadOutline, calendarOutline, chatboxEllipsesOutline, closeOutline,
} from 'ionicons/icons';
import { Auth } from '../../auth';
import { DataService } from '../../shared/data.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { humanError } from '../../shared/errors';
import { CommerceOption, OttApp } from '../../shared/models';

@Component({
  selector: 'app-accnttype',
  templateUrl: './accnttype.page.html',
  styleUrls: ['./accnttype.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, OttLogoComponent],
})
export class AccnttypePage implements OnInit {
  ottId = '';
  app: OttApp | null = null;
  options: CommerceOption[] = [];
  loading = true;
  error = '';

  /** Create Group form — opens inline once Share is tapped. */
  showGroupForm = false;
  submitting = false;
  groupForm = { tierId: '', dateFrom: '', dateTo: '', proofName: '', comment: '' };
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
    });
  }

  async ngOnInit() {
    this.ottId = this.route.snapshot.queryParamMap.get('id') ?? '';
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
      const [app, options] = await Promise.all([
        this.data.getOttApp(this.ottId),
        this.data.getCommerceOptions(),
      ]);
      this.app = app;
      this.options = options.filter(o => o.active);
      if (!app) this.error = 'That platform is no longer available.';
    } catch (e) {
      this.error = 'Could not load this platform.';
      console.error(e);
    } finally {
      this.loading = false;
    }
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

  closeGroupForm() { this.showGroupForm = false; }

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
    if (!f.tierId)   return 'Choose which plan you are sharing';
    if (!f.dateFrom) return 'Enter the start date';
    if (!f.dateTo)   return 'Enter the end date';
    if (new Date(f.dateTo) <= new Date(f.dateFrom)) return 'The end date must be after the start date';
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
      this.groupForm = { tierId: '', dateFrom: '', dateTo: '', proofName: '', comment: '' };
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