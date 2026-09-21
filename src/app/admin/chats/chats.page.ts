import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, IonRefresher, IonRefresherContent, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { lockClosedOutline, chatbubbleEllipsesOutline, eyeOutline, headsetOutline } from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { AdminSearchbarComponent, FilterChip } from '../shared/admin-searchbar.component';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { DataService } from '../../shared/data.service';
import { ChatThread } from '../../shared/models';

interface MessageHit {
  id: string; threadId: string; text: string; time: string;
  senderName: string; senderUniqueNum: number;
}

/** 12 — Chat's. Live group (trade) chats and support conversations with
 *  the App Team. Every non-group thread is a support chat — nothing else
 *  creates one, since purchase_screen() always attaches a group. */
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

  /** "search Number search, because some sellers try to share their
   *  numbers ... Main is identifying the number sharing person" — a search
   *  across every message's actual text, not just the thread list's own
   *  fields. Kept separate from `shown` since these are individual
   *  messages, not conversations, and a term short enough to be a normal
   *  name search should not also fire this. */
  messageHits: MessageHit[] = [];
  searchingMessages = false;
  private searchDebounce?: ReturnType<typeof setTimeout>;

  chips: FilterChip[] = [
    { key: 'all',     label: 'All Chats',    tone: 'plain' },
    { key: 'group',   label: 'Live Groups',  tone: 'green' },
    { key: 'private', label: 'Support',      tone: 'red' },
  ];

  constructor(
    private data: DataService,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
  ) {
    addIcons({ lockClosedOutline, chatbubbleEllipsesOutline, eyeOutline, headsetOutline });
  }

  async ngOnInit() {
    this.all = await this.data.getThreads();
    this.apply();

    // Reached from a user's card in User's Data via "Chat" — the query
    // param carried the user's id but this page never read it, so tapping
    // Chat just landed here on the unfiltered list with no indication of
    // who the admin meant to reach. Reported as "Chat button not
    // available". Prefer the support thread if one exists — the most
    // likely reason admin wants to talk to this person directly — else
    // any thread this user is part of, as either buyer or seller.
    const userId = this.route.snapshot.queryParamMap.get('user');
    if (userId) await this.openForUser(userId);
  }

  private async openForUser(userId: string) {
    const theirs = this.all.filter(t => t.buyerId === userId || t.sellerId === userId);
    const support = theirs.find(t => !t.isGroup);
    const target = support ?? theirs[0];

    if (!target) {
      const t = await this.toastCtrl.create({
        message: 'This user has no conversation yet.',
        duration: 2600, position: 'bottom',
      });
      t.present();
      return;
    }
    this.openThread(target);
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

    // Runs alongside the thread filter above, not instead of it — a search
    // is as likely to be a name as a number, and both should work.
    clearTimeout(this.searchDebounce);
    if (this.term.trim().length < 3) { this.messageHits = []; return; }
    this.searchDebounce = setTimeout(async () => {
      this.searchingMessages = true;
      try { this.messageHits = await this.data.searchMessages(this.term); }
      catch { this.messageHits = []; }
      finally { this.searchingMessages = false; }
    }, 400);
  }

  openHit(hit: MessageHit) {
    this.router.navigate(['/admin/chat'], { queryParams: { thread: hit.threadId } });
  }

  setChip(k: string) { this.activeChip = k; this.apply(); }

  title(c: ChatThread) {
    return c.isGroup
      ? `${c.ottName} · ${c.tierLabel} · ${c.months}M`
      : `${c.peerName} (${c.peerUniqueNum})`;
  }

  openThread(c: ChatThread) {
    this.router.navigate(['/admin/chat'], { queryParams: { thread: c.id } });
  }

  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }
}
