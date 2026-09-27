import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ActionSheetController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, ellipsisVerticalOutline, sendOutline, imageOutline,
  starOutline, lockClosedOutline, chevronForwardOutline, flagOutline,
  warningOutline, chevronUpOutline, chevronDownOutline, documentTextOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { Auth } from '../../auth';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { ImageEditorComponent } from '../../shared/image-editor/image-editor.component';
import { humanError } from '../../shared/errors';
import { ChatMessage, ChatThread, QuickReply } from '../../shared/models';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, OttLogoComponent, ImageEditorComponent],
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild('scrollArea') scrollArea!: IonContent;
  @ViewChild('imgInput') imgInput!: ElementRef<HTMLInputElement>;

  private unsubscribe?: () => void;
  private unsubscribeThread?: () => void;
  private unsubscribePresence?: () => void;

  thread: ChatThread | null = null;
  messages: ChatMessage[] = [];
  draft = '';
  sending = false;
  loading = true;
  error = '';

  /** "I can able to add notes because i need to make note on them" —
   *  admin only, never shown to the user themselves. */
  adminNote = '';
  savingNote = false;
  /** "Ratings and badges on drag down" — one panel instead of two separate
   *  pieces (ratings/badges, and admin's private note) each with their own
   *  toggle. Collapsed by default, same reasoning as the notice below. */
  infoOpen = false;
  private noteSaveTimer?: ReturnType<typeof setTimeout>;
  /** Collapsed by default — "Notice should be Slightly visible ... Make
   *  more space for Chat". Full text is one tap away, not removed. */
  noticeOpen = false;

  /** "Put Quick reply customly i admin can create what User, seller or
   *  admin can use and put no of times usage count" — admin-managed now
   *  (see /admin/quickreplies), was five hardcoded strings shown to everyone. */
  private allQuickReplies: QuickReply[] = [];

  get myRoleInThread(): 'user' | 'seller' | 'admin' {
    if (this.isAdmin) return 'admin';
    return this.thread?.iAmBuyer === false ? 'seller' : 'user';
  }

  /** Filtered to this person's role in this thread, and to ones not yet
   *  used up in this conversation — "no of times usage count" is per
   *  conversation, counted from messages already loaded here, not a
   *  separate stored counter. */
  get quickReplies(): string[] {
    const role = this.myRoleInThread;
    return this.allQuickReplies
      .filter(q => q.active && (q.forRole === 'all' || q.forRole === role))
      .filter(q => {
        if (!q.maxUses) return true;
        const used = this.messages.filter(m => m.isMine && m.text === q.text).length;
        return used < q.maxUses;
      })
      .map(q => q.text);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data: DataService,
    private auth: Auth,
    private sheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      arrowBackOutline, ellipsisVerticalOutline, sendOutline, imageOutline,
      starOutline, lockClosedOutline, chevronForwardOutline, flagOutline,
      warningOutline, chevronUpOutline, chevronDownOutline, documentTextOutline,
      notificationsOutline,
    });
  }

  async ngOnInit() {
    await this.enter();
  }

  // Ionic reuses this page instance when the user goes back to Chats and
  // opens a different conversation — same route, only ?thread= changes —
  // so without this it kept showing the previous thread. load() already
  // tears down the old subscription before opening the new one, so this is
  // safe to call again.
  ionViewWillEnter() { this.enter(); }

  private async enter() {
    const id = this.route.snapshot.queryParamMap.get('thread');
    await this.load(id);
  }

  async load(threadId?: string | null) {
    this.loading = true;
    this.error = '';
    try {
      if (!this.allQuickReplies.length) {
        this.data.getQuickReplies().then(q => this.allQuickReplies = q).catch(() => {});
      }
      const threads = await this.data.getThreads();
      this.thread = threadId
        ? threads.find(t => t.id === threadId) ?? null
        : threads[0] ?? null;

      if (!this.thread) {
        this.error = 'No conversation yet. Buy or share a screen to start one.';
        return;
      }
      this.messages = await this.data.getMessages(this.thread.id);
      setTimeout(() => this.scrollArea?.scrollToBottom(0), 80);
      this.listen(this.thread.id);

      // "Show Ratings and Batches on Top User details of oposit person".
      // Best-effort — the conversation itself must not fail to open over this.
      if (this.thread.peerId) {
        this.data.getPeerStats(this.thread.peerId)
          .then(s => { if (this.thread) Object.assign(this.thread, s); })
          .catch(() => {});

        if (this.isAdmin) {
          this.data.getUserNote(this.thread.peerId)
            .then(n => { this.adminNote = n; })
            .catch(() => {});
        }
      }
    } catch (e) {
      this.error = 'Could not load this chat.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Live updates for this thread. Our own sends already appear optimistically,
   * so the echo of a message we sent is ignored — otherwise it would show twice.
   */
  private listen(threadId: string) {
    this.unsubscribe?.();
    this.unsubscribe = this.data.onNewMessage(threadId, (m) => {
      if (this.messages.some(x => x.id === m.id)) return;
      if (m.isMine) return;
      this.messages.push(m);
      setTimeout(() => this.scrollArea?.scrollToBottom(200), 60);
    });

    // Reported as "after opposite person unlock, still it taking time to
    // update... every time had to go back and reopen". onNewMessage() only
    // fires for new messages — a change to the thread row itself (media
    // unlock) was invisible until the page reloaded.
    this.unsubscribeThread?.();
    this.unsubscribeThread = this.data.onThreadUpdate(threadId, async () => {
      const fresh = await this.data.getThread(threadId);
      if (fresh) this.thread = fresh;
    });

    // Online dot lives on profiles, a different table, so it needs its own
    // subscription — see onPeerPresence().
    this.unsubscribePresence?.();
    if (this.thread?.peerId) {
      this.unsubscribePresence = this.data.onPeerPresence(this.thread.peerId, (online) => {
        if (this.thread) this.thread.isOnline = online;
      });
    }
  }

  get isAdmin() { return this.auth.role === 'admin'; }

  /** Whether the peer-card's drop-down caret shows at all — admin always
   *  has the note option, everyone else only when there's something to see. */
  get hasInfoPanel(): boolean {
    if (this.isAdmin) return true;
    return !this.isSupportThread && !!(this.thread?.reviewCount || this.thread?.badges?.length);
  }

  /** Saves a moment after typing stops, rather than on every keystroke. */
  onNoteChange() {
    if (!this.thread?.peerId) return;
    clearTimeout(this.noteSaveTimer);
    this.noteSaveTimer = setTimeout(async () => {
      this.savingNote = true;
      try { await this.data.saveUserNote(this.thread!.peerId!, this.adminNote); }
      catch { /* best effort — a note is not worth interrupting the chat over */ }
      finally { this.savingNote = false; }
    }, 900);
  }

  /**
   * Both sides must unlock before photos or voice are allowed (Q5) — but
   * only for a trade, where the mutual-unlock dance exists to stop either
   * side rushing a photo through before they mean to. A support
   * conversation with the App Team is not a trade, and there is nothing
   * for admin to protect themselves from in their own inbox. Reported as
   * "Unlock all no Lock option required" (admin) and "No restrictions for
   * Admin".
   */
  get mediaOpen() {
    if (this.isSupportThread || this.isAdmin) return true;
    return !!this.thread?.buyerMediaUnlocked && !!this.thread?.sellerMediaUnlocked;
  }

  get iUnlocked() {
    if (this.mediaOpen) return true;
    if (!this.thread) return false;
    return this.thread.iAmBuyer
      ? this.thread.buyerMediaUnlocked
      : this.thread.sellerMediaUnlocked;
  }

  /** "Put Bell icon and Trail count... refils 12 hours" — only the buyer
   *  side can ring, and only when the seller is actually offline (that is
   *  the whole point of it). */
  get canRing(): boolean {
    return this.myRoleInThread === 'user' && !this.isSupportThread && !this.thread?.isOnline;
  }

  private readonly TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

  get ringReady(): boolean {
    if (!this.thread?.lastRingAt) return true;
    return Date.now() - new Date(this.thread.lastRingAt).getTime() >= this.TWELVE_HOURS_MS;
  }

  /** Rough "Available in Xh Ym" — no need for a live-ticking timer here. */
  get ringWaitLabel(): string {
    if (!this.thread?.lastRingAt) return '';
    const remaining = this.TWELVE_HOURS_MS - (Date.now() - new Date(this.thread.lastRingAt).getTime());
    if (remaining <= 0) return '';
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  ringing = false;

  async ring() {
    if (!this.thread || this.ringing || !this.ringReady) return;
    this.ringing = true;
    try {
      const res = await this.data.ringSeller(this.thread.id);
      if (res.ok) {
        this.thread.lastRingAt = new Date().toISOString();
        this.toast('🔔 Rung — they will be notified.');
      } else {
        this.toast(`Already rung. Try again in ${this.ringWaitLabel}.`);
      }
    } catch (e: any) {
      this.toast(humanError(e, 'Could not ring right now'));
    } finally {
      this.ringing = false;
    }
  }

  async toggleMedia() {
    if (!this.thread) return;
    const next = !this.iUnlocked;
    try {
      await this.data.setMediaUnlock(this.thread.id, next);
      if (this.thread.iAmBuyer) this.thread.buyerMediaUnlocked = next;
      else this.thread.sellerMediaUnlocked = next;

      this.toast(
        !next ? 'Media locked'
          : this.mediaOpen
            ? 'Media unlocked — you can both share photos now'
            : 'Waiting for the other person to unlock too',
      );
    } catch (e) {
      this.toast(humanError(e, 'Could not change the lock'));
    }
  }

  ngOnDestroy() {
    this.unsubscribe?.();
    this.unsubscribeThread?.();
    this.unsubscribePresence?.();
    clearTimeout(this.noteSaveTimer);
    // Presence itself is handled once, app-wide, by the appStateChange
    // listener in native.service.ts — online while the app is open,
    // offline once it is backgrounded. This page used to also flip it
    // on mount/unmount, so leaving the chat for any other screen in the
    // app (not backgrounding it) incorrectly marked the user offline,
    // fighting the correct app-wide signal. Reported as "Not updating
    // Immediately" and "should show Green [while backgrounded], Offline
    // [once removed from background]" — that behaviour already exists in
    // native.service.ts; this page was overriding it.
    //
    // Q5 — closing the conversation re-locks media, so a one-off unlock
    // does not stay open for the next visit.
    if (this.thread && this.iUnlocked) {
      this.data.setMediaUnlock(this.thread.id, false).catch(() => {});
    }
  }

  get title() {
    if (!this.thread) return '';
    return this.thread.isGroup
      ? `${this.thread.ottName}`
      : `${this.thread.peerName} (${this.thread.peerUniqueNum})`;
  }

  // Reused for admin's inbox too — see /admin/chat in admintab.routes.ts —
  // so "back" has to land on whichever list actually sent us here.
  back() {
    this.router.navigate([this.auth.role === 'admin' ? '/admin/chats' : '/user/chats']);
  }

  /** A support conversation with the App Team, not a trade — "Rate this
   *  seller" and reporting a dispute have nothing to act on there. */
  get isSupportThread() {
    return !!this.thread && !this.thread.isGroup && !this.thread.ottName;
  }

  async send(text?: string) {
    const body = (text ?? this.draft).trim();
    if (!body || !this.thread || this.sending) return;
    if (this.thread.locked) { this.toast('This conversation is closed'); return; }

    this.sending = true;
    const optimistic: ChatMessage = {
      id: 'tmp-' + Date.now(), threadId: this.thread.id, text: body, isMine: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.messages.push(optimistic);
    this.draft = '';
    setTimeout(() => this.scrollArea?.scrollToBottom(200), 60);

    try {
      const saved = await this.data.sendMessage(this.thread.id, body);
      // swap the placeholder for the stored row
      const i = this.messages.indexOf(optimistic);
      if (i >= 0) this.messages[i] = saved;
    } catch (e: any) {
      this.messages = this.messages.filter(m => m !== optimistic);
      this.draft = body;
      this.toast(humanError(e, 'Message not sent'));
    } finally {
      this.sending = false;
    }
  }

  pickImage() {
    if (!this.thread || this.thread.locked) { this.toast('This conversation is closed'); return; }
    if (!this.mediaOpen) {
      this.toast(
        this.iUnlocked
          ? 'Waiting for the other person to unlock media'
          : 'Tap the lock to allow photos. Both of you must unlock.',
      );
      return;
    }
    this.imgInput.nativeElement.click();
  }

  /** "Put options (Crop, Sticker, Text, Pen) like whatsapp chat" — a photo
   *  goes through the editor before it's ever uploaded, same as WhatsApp's
   *  own send-photo screen. */
  editingFile: File | null = null;

  onImage(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (!file) return;
    this.editingFile = file;
  }

  cancelEdit() {
    this.editingFile = null;
  }

  async sendEditedImage(file: File) {
    this.editingFile = null;
    if (!this.thread) return;

    this.sending = true;
    try {
      const saved = await this.data.sendChatImage(this.thread.id, file);
      this.messages.push(saved);
      setTimeout(() => this.scrollArea?.scrollToBottom(200), 60);
    } catch (err: any) {
      this.toast(humanError(err, 'Could not send the photo'));
    } finally {
      this.sending = false;
    }
  }

  openRating() {
    this.router.navigate(['/user/rating'], { queryParams: { thread: this.thread?.id } });
  }

  async openMore() {
    const buttons = this.isSupportThread
      ? []
      : [
          { text: 'Rate this seller', icon: 'star-outline', handler: () => this.openRating() },
          {
            text: 'Report this conversation', icon: 'flag-outline', role: 'destructive' as const,
            handler: () => { this.report(); },
          },
        ];

    const sheet = await this.sheetCtrl.create({
      header: this.title,
      buttons: [...buttons, { text: 'Cancel', role: 'cancel' as const }],
    });
    await sheet.present();
  }

  private async report() {
    if (!this.thread) return;
    try {
      await this.data.reportThread(this.thread.id);
      this.toast('Reported. Admin can now review this conversation.');
    } catch (e: any) {
      this.toast(humanError(e, 'Could not report'));
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
}