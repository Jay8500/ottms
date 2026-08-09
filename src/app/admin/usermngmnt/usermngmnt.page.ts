import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, calendarOutline, callOutline, mailOutline,
  checkmarkCircle, businessOutline, cardOutline, shieldOutline,
  chevronUpOutline, chevronDownOutline, chatbubbleEllipsesOutline,
  peopleOutline, personAddOutline, cashOutline, starOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { AdminSearchbarComponent, FilterChip } from '../shared/admin-searchbar.component';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { DataService } from '../../shared/data.service';
import { ExportService } from '../../shared/export.service';
import { AppUser, GroupScreen } from '../../shared/models';

interface UserRow extends AppUser {
  expanded: boolean;
  joined: GroupScreen[];
}

/** 7 — User's Data. Profile, ratings, badges, bank details and activity. */
@Component({
  selector: 'app-usermngmnt',
  templateUrl: './usermngmnt.page.html',
  styleUrls: ['./usermngmnt.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, AdminSearchbarComponent, OttLogoComponent, IonRefresher, IonRefresherContent
  ],
})
export class UsermngmntPage implements OnInit {
  term = '';
  activeChip = 'all';
  rows: UserRow[] = [];
  shown: UserRow[] = [];

  chips: FilterChip[] = [
    { key: 'all',      label: 'All',      tone: 'plain' },
    { key: 'stars',    label: 'Ratings',  tone: 'yellow' },
    { key: 'badges',   label: 'Batches',  tone: 'green' },
    { key: 'sellers',  label: 'Sellers',  tone: 'red' },
  ];

  constructor(
    private data: DataService,
    private exporter: ExportService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      personOutline, calendarOutline, callOutline, mailOutline,
      checkmarkCircle, businessOutline, cardOutline, shieldOutline,
      chevronUpOutline, chevronDownOutline, chatbubbleEllipsesOutline,
      peopleOutline, personAddOutline, cashOutline, starOutline,
    });
  }

  async ngOnInit() {
    const users = await this.data.getUsers();
    const groups = await this.data.getGroups();
    this.rows = users.map(u => ({
      ...u, expanded: false,
      joined: groups.filter(g => g.sellerId !== u.id).slice(0, 2),
    }));
    this.apply();
  }

  apply() {
    const t = this.term.trim().toLowerCase();
    let list = this.rows.filter(u =>
      !t || u.name.toLowerCase().includes(t) || String(u.uniqueNumber).includes(t)
        || u.mobile.includes(t));

    if (this.activeChip === 'sellers') list = list.filter(u => u.isSeller);
    if (this.activeChip === 'stars')   list = [...list].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    if (this.activeChip === 'badges')  list = [...list].sort((a, b) => b.badges.length - a.badges.length);

    this.shown = list;
  }

  setChip(k: string) { this.activeChip = k; this.apply(); }

  toggle(u: UserRow) { u.expanded = !u.expanded; }

  stars(n: number, kind: 'on' | 'off') {
    return Array(kind === 'on' ? n : Math.max(0, 5 - n)).fill(0);
  }

  chat(u: UserRow) {
    this.router.navigate(['/admin/chats'], { queryParams: { user: u.id } });
  }

  async removeUser(u: UserRow) {
    const alert = await this.alertCtrl.create({
      header: 'Remove account?',
      message: `${u.name} (${u.uniqueNumber}) will lose access. Wallet balance of ` +
               `₹${u.walletAmount.toLocaleString('en-IN')} must be settled first.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove', role: 'destructive',
          handler: () => {
            this.rows = this.rows.filter(x => x.id !== u.id);
            this.apply();
            this.toast(`${u.name} removed`);
          },
        },
      ],
    });
    await alert.present();
  }

  exportCsv() {
    if (!this.shown.length) { this.toast('Nothing to export'); return; }
    this.exporter.download<UserRow>('users', [
      ['name', 'Name'], ['nickName', 'Nick Name'], ['uniqueNumber', 'User ID'],
      ['mobile', 'Mobile'], ['email', 'Email'], ['registeredDate', 'Registered'],
      ['rating', 'Rating'], ['reviewCount', 'Reviews'],
      ['walletAmount', 'Wallet'], ['lockedAmount', 'Locked'], ['unlockedAmount', 'Unlocked'],
      ['groupsJoined', 'Groups Joined'], ['groupsCreated', 'Groups Created'], ['txCount', 'Transactions'],
    ], this.shown);
    this.toast(`Exported ${this.shown.length} users`);
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