import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { lockClosedOutline, chatbubbleEllipsesOutline, eyeOutline } from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { AdminSearchbarComponent, FilterChip } from '../shared/admin-searchbar.component';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { DataService } from '../../shared/data.service';
import { ChatThread } from '../../shared/models';

/** 12 — Chat's. Live group chats and private one-to-one threads. */
@Component({
  selector: 'app-admin-chats',
  templateUrl: './chats.page.html',
  styleUrls: ['./chats.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, AdminSearchbarComponent, OttLogoComponent, IonRefresher, IonRefresherContent
  ],
})
export class AdminChatsPage implements OnInit {
  term = '';
  activeChip = 'all';
  all: ChatThread[] = [];
  shown: ChatThread[] = [];

  chips: FilterChip[] = [
    { key: 'all',     label: 'All Chats',    tone: 'plain' },
    { key: 'group',   label: 'Live Groups',  tone: 'green' },
    { key: 'private', label: 'Private Chats',tone: 'red' },
  ];

  constructor(private data: DataService, private alertCtrl: AlertController) {
    addIcons({ lockClosedOutline, chatbubbleEllipsesOutline, eyeOutline });
  }

  async ngOnInit() {
    this.all = await this.data.getThreads();
    this.apply();
  }

  apply() {
    const t = this.term.trim().toLowerCase();
    this.shown = this.all.filter(c => {
      if (this.activeChip === 'group' && !c.isGroup) return false;
      if (this.activeChip === 'private' && c.isGroup) return false;
      if (!t) return true;
      return [c.peerName, c.sellerName, c.ottName, c.lastMessage]
        .some(v => v?.toLowerCase().includes(t));
    });
  }

  setChip(k: string) { this.activeChip = k; this.apply(); }

  title(c: ChatThread) {
    return c.isGroup
      ? `${c.ottName} · ${c.tierLabel} · ${c.months}M`
      : `${c.peerName} (${c.peerUniqueNum})`;
  }

  async openThread(c: ChatThread) {
    const alert = await this.alertCtrl.create({
      header: this.title(c),
      subHeader: c.isGroup ? `Seller: ${c.sellerName} (${c.sellerUniqueNum})` : undefined,
      message:
        'Opening a user conversation exposes private messages. The in-chat notice ' +
        'tells users not to share personal details, so reading threads should be ' +
        'limited to dispute handling. Transcript viewing is not wired up yet.',
      buttons: ['Close'],
    });
    await alert.present();
  }
  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }

}