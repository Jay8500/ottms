import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController, ToastController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  starOutline, star, trashOutline, createOutline, calendarOutline,
  peopleOutline, pricetagOutline, trendingUpOutline, removeCircle, addCircle,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { AdminSearchbarComponent, FilterChip } from '../shared/admin-searchbar.component';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { DataService } from '../../shared/data.service';
import { ExportService } from '../../shared/export.service';
import { BadgeAward, UserRating } from '../../shared/models';

/** 15 — Ratings. Star reviews and awarded badges ("batches"), each with a
 *  summary strip and a star threshold filter. */
@Component({
  selector: 'app-admin-ratings',
  templateUrl: './ratings.page.html',
  styleUrls: ['./ratings.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, AdminSearchbarComponent, OttLogoComponent, IonRefresher, IonRefresherContent
  ],
})
export class AdminRatingsPage implements OnInit {
  mode: 'ratings' | 'batches' = 'ratings';
  term = '';
  /** Show reviews at or above this star count. 0 = all. */
  threshold = 0;

  private allRatings: UserRating[] = [];
  private allAwards: BadgeAward[] = [];
  ratings: UserRating[] = [];
  awards: BadgeAward[] = [];

  chips: FilterChip[] = [
    { key: 'ratings', label: 'User Ratings', tone: 'yellow' },
    { key: 'batches', label: 'User Batches', tone: 'green' },
  ];

  constructor(
    private data: DataService,
    private exporter: ExportService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      starOutline, star, trashOutline, createOutline, calendarOutline,
      peopleOutline, pricetagOutline, trendingUpOutline, removeCircle, addCircle,
    });
  }

  async ngOnInit() {
    this.allRatings = await this.data.getRatings();
    this.allAwards = await this.data.getBadgeAwards();
    this.apply();
  }

  apply() {
    const t = this.term.trim().toLowerCase();
    const hit = (...vals: (string | number | undefined)[]) =>
      !t || vals.some(v => String(v ?? '').toLowerCase().includes(t));

    this.ratings = this.allRatings
      .filter(r => r.stars >= this.threshold)
      .filter(r => hit(r.userName, r.userUniqueNum, r.text, r.ottName));

    this.awards = this.allAwards
      .filter(a => hit(a.userName, a.userUniqueNum, a.label, a.ottName));
  }

  setChip(k: string) { this.mode = k as 'ratings' | 'batches'; this.apply(); }

  setThreshold(n: number) { this.threshold = n; this.apply(); }

  stars(n: number, kind: 'on' | 'off') {
    return Array(kind === 'on' ? n : Math.max(0, 5 - n)).fill(0);
  }

  // ── Summaries ───────────────────────────────────────────────────────────
  get totalRatings() { return this.allRatings.length; }
  get belowTwo()     { return this.allRatings.filter(r => r.stars < 2).length; }
  get aboveTwo()     { return this.allRatings.filter(r => r.stars > 2).length; }

  get totalAwards()    { return this.allAwards.length; }
  get positiveAwards() { return this.allAwards.filter(a => a.positive).length; }
  get negativeAwards() { return this.allAwards.filter(a => !a.positive).length; }

  // ── Actions ─────────────────────────────────────────────────────────────
  async editRating(r: UserRating) {
    const alert = await this.alertCtrl.create({
      header: `${r.userName} (${r.userUniqueNum})`,
      subHeader: 'Editing a user’s own words changes what other buyers read.',
      inputs: [
        { name: 'stars', type: 'number', min: 1, max: 5, value: r.stars, placeholder: 'Stars 1–5' },
        { name: 'text', type: 'textarea', value: r.text, placeholder: 'Review' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (d) => {
            const n = Number(d.stars);
            if (!(n >= 1 && n <= 5)) { this.toast('Stars must be between 1 and 5'); return false; }
            r.stars = n;
            r.text = d.text?.trim() ?? r.text;
            await this.data.saveRating(r);
            this.apply();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteRating(r: UserRating) {
    const alert = await this.alertCtrl.create({
      header: 'Delete this review?',
      message: `${r.stars}★ from ${r.userName}. The seller's average rating is recalculated.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.data.deleteRating(r.id);
            this.allRatings = await this.data.getRatings();
            this.apply();
            this.toast('Review deleted');
          },
        },
      ],
    });
    await alert.present();
  }

  async editAward(a: BadgeAward) {
    const alert = await this.alertCtrl.create({
      header: `${a.userName} (${a.userUniqueNum})`,
      inputs: [
        { name: 'label', type: 'text', value: a.label, placeholder: 'Badge name' },
        { name: 'emoji', type: 'text', value: a.emoji, placeholder: 'Emoji' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (d) => {
            if (!d.label?.trim()) return false;
            a.label = d.label.trim();
            a.emoji = d.emoji?.trim() || a.emoji;
            await this.data.saveBadgeAward(a);
            this.apply();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteAward(a: BadgeAward) {
    const alert = await this.alertCtrl.create({
      header: 'Remove this badge?',
      message: `“${a.label}” is taken away from ${a.userName}.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove', role: 'destructive',
          handler: async () => {
            await this.data.deleteBadgeAward(a.id);
            this.allAwards = await this.data.getBadgeAwards();
            this.apply();
            this.toast('Badge removed');
          },
        },
      ],
    });
    await alert.present();
  }

  exportCsv() {
    if (this.mode === 'ratings') {
      if (!this.ratings.length) { this.toast('Nothing to export'); return; }
      this.exporter.download<UserRating>('ratings', [
        ['date', 'Date'], ['userName', 'User'], ['userUniqueNum', 'User ID'],
        ['stars', 'Stars'], ['ottName', 'OTT'], ['text', 'Review'],
      ], this.ratings);
      this.toast(`Exported ${this.ratings.length} reviews`);
    } else {
      if (!this.awards.length) { this.toast('Nothing to export'); return; }
      this.exporter.download<BadgeAward>('batches', [
        ['date', 'Date'], ['userName', 'User'], ['userUniqueNum', 'User ID'],
        ['label', 'Badge'], ['positive', 'Positive'], ['ottName', 'OTT'],
      ], this.awards);
      this.toast(`Exported ${this.awards.length} badges`);
    }
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