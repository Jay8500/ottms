import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonRefresher, IonRefresherContent,
  ViewWillEnter, ViewWillLeave,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { lockClosedOutline, chatbubblesOutline, optionsOutline } from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { ChatThread } from '../../shared/models';

/** The Chats tab — every conversation this user is part of. */
@Component({
  selector: 'app-user-chats',
  templateUrl: './chats.page.html',
  styleUrls: ['./chats.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    IonRefresher, IonRefresherContent, OttLogoComponent,
  ],
})
export class UserChatsPage implements ViewWillEnter, ViewWillLeave {
  threads: ChatThread[] = [];
  loading = true;
  error = '';

  private unsubscribe?: () => void;

  constructor(private router: Router, private data: DataService) {
    addIcons({ lockClosedOutline, chatbubblesOutline, optionsOutline });
  }

  /** Refresh on every visit — a purchase may have opened a new thread. */
  ionViewWillEnter() {
    this.load();
    // Reorder live as messages land in other threads.
    this.unsubscribe = this.data.onThreadChange(() => this.load(true));
  }

  ionViewWillLeave() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /** `quiet` refreshes in place without flashing the skeleton. */
  async load(quiet = false) {
    if (!quiet) this.loading = true;
    this.error = '';
    try {
      this.threads = await this.data.getThreads();
    } catch (e) {
      if (!quiet) this.error = 'Could not load your chats.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.load(true);
    (ev.target as HTMLIonRefresherElement).complete();
  }

  title(c: ChatThread) {
    return c.isGroup ? `${c.ottName} · ${c.months}M` : `${c.peerName} (${c.peerUniqueNum})`;
  }

  open(c: ChatThread) {
    this.router.navigate(['/user/chat'], { queryParams: { thread: c.id } });
  }

  browse() { this.router.navigate(['/user/category']); }
}