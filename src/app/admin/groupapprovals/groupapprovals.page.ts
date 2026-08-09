import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  imageOutline, chatbubbleEllipsesOutline, trashOutline,
  checkmarkCircleOutline, calendarOutline, desktopOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { AdminSearchbarComponent, FilterChip } from '../shared/admin-searchbar.component';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { DataService } from '../../shared/data.service';
import { ExportService } from '../../shared/export.service';
import { GroupScreen, OttApp } from '../../shared/models';

/** 8 — Group's. Browse by OTT platform, or review approved / pending groups. */
@Component({
  selector: 'app-groupapprovals',
  templateUrl: './groupapprovals.page.html',
  styleUrls: ['./groupapprovals.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, AdminSearchbarComponent, OttLogoComponent, IonRefresher, IonRefresherContent
  ],
})
export class GroupapprovalsPage implements OnInit {
  term = '';
  activeChip = 'ott';

  apps: OttApp[] = [];
  private allGroups: GroupScreen[] = [];
  shown: GroupScreen[] = [];
  shownApps: OttApp[] = [];

  chips: FilterChip[] = [
    { key: 'ott',      label: 'OTT Apps',        tone: 'plain' },
    { key: 'approved', label: "Approved Group's", tone: 'green' },
    { key: 'pending',  label: "Pending Group's",  tone: 'red' },
  ];

  constructor(
    private data: DataService,
    private exporter: ExportService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      imageOutline, chatbubbleEllipsesOutline, trashOutline,
      checkmarkCircleOutline, calendarOutline, desktopOutline,
    });
  }

  async ngOnInit() {
    this.apps = await this.data.getOttApps();
    await this.reload();
  }

  private async reload() {
    this.allGroups = await this.data.getGroups();
    this.apply();
  }

  apply() {
    const t = this.term.trim().toLowerCase();

    if (this.activeChip === 'ott') {
      this.shownApps = !t ? [...this.apps] : this.apps.filter(a => a.title.toLowerCase().includes(t));
      this.shown = [];
      return;
    }

    this.shownApps = [];
    this.shown = this.allGroups.filter(g => {
      const isPending = g.status === 'pending';
      if (this.activeChip === 'pending' && !isPending) return false;
      if (this.activeChip === 'approved' && isPending) return false;
      if (!t) return true;
      return [g.sellerName, g.ottName, String(g.sellerUniqueNum)]
        .some(v => v?.toLowerCase().includes(t));
    });
  }

  setChip(k: string) { this.activeChip = k; this.apply(); }

  /** Tapping a platform tile drills into that platform's groups. */
  openApp(a: OttApp) {
    this.activeChip = 'approved';
    this.term = a.title;
    this.apply();
  }

  async approve(g: GroupScreen) {
    const alert = await this.alertCtrl.create({
      header: 'Approve group?',
      message: `${g.ottName} ${g.tierLabel} by ${g.sellerName} (${g.sellerUniqueNum}). ` +
               `It goes live in the Sellers List with ${g.seatsTotal} seats.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: async () => {
            await this.data.setGroupStatus(g.id, 'approved');
            await this.reload();
            this.toast('Group approved');
          },
        },
      ],
    });
    await alert.present();
  }

  async remove(g: GroupScreen) {
    const alert = await this.alertCtrl.create({
      header: 'Reject this group?',
      message: `${g.ottName} by ${g.sellerName}. The seller is notified and the listing never goes live.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject', role: 'destructive',
          handler: async () => {
            await this.data.setGroupStatus(g.id, 'rejected');
            await this.reload();
            this.toast('Group rejected');
          },
        },
      ],
    });
    await alert.present();
  }

  async viewProof(g: GroupScreen) {
    const alert = await this.alertCtrl.create({
      header: 'Subscription Proof',
      subHeader: `${g.ottName} · ${g.tierLabel}`,
      message: g.proofUrl
        ? `Uploaded file: ${g.proofUrl}<br /><br />Storage is not wired up yet, so the image cannot be previewed.`
        : 'The seller did not upload proof.',
      buttons: ['Close'],
    });
    await alert.present();
  }

  chat(g: GroupScreen) {
    this.router.navigate(['/admin/chats'], { queryParams: { seller: g.sellerId } });
  }

  exportCsv() {
    const rows = this.activeChip === 'ott' ? this.allGroups : this.shown;
    if (!rows.length) { this.toast('Nothing to export'); return; }
    this.exporter.download<GroupScreen>('groups', [
      ['ottName', 'OTT'], ['tierLabel', 'Plan'], ['sellerName', 'Seller'],
      ['sellerUniqueNum', 'Seller ID'], ['dateFrom', 'From'], ['dateTo', 'To'],
      ['months', 'Months'], ['seatsTotal', 'Seats'], ['seatsFilled', 'Filled'],
      ['price', 'Price'], ['status', 'Status'],
    ], rows);
    this.toast(`Exported ${rows.length} groups`);
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2200, position: 'bottom' });
    t.present();
  }
  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }

}