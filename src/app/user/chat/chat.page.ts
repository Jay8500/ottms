import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ActionSheetController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, ellipsisVerticalOutline, sendOutline, imageOutline,
  starOutline, lockClosedOutline, chevronForwardOutline, flagOutline,
} from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { humanError } from '../../shared/errors';
import { ChatMessage, ChatThread } from '../../shared/models';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, OttLogoComponent],
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild('scrollArea') scrollArea!: IonContent;
  @ViewChild('imgInput') imgInput!: ElementRef<HTMLInputElement>;

  private unsubscribe?: () => void;

  thread: ChatThread | null = null;
  messages: ChatMessage[] = [];
  draft = '';
  sending = false;
  loading = true;
  error = '';

  readonly quickReplies = ['👋 Hi,', 'Credentials ?', 'Validity ?', 'OTP ?', 'Thank you!'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data: DataService,
    private sheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      arrowBackOutline, ellipsisVerticalOutline, sendOutline, imageOutline,
      starOutline, lockClosedOutline, chevronForwardOutline, flagOutline,
    });
  }

  async ngOnInit() {
    this.data.setPresence(true);
    const id = this.route.snapshot.queryParamMap.get('thread');
    await this.load(id);
  }

  async load(threadId?: string | null) {
    this.loading = true;
    this.error = '';
    try {
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
  }

  ngOnDestroy() {
    this.unsubscribe?.();
    this.data.setPresence(false);
  }

  get title() {
    if (!this.thread) return '';
    return this.thread.isGroup
      ? `${this.thread.ottName}`
      : `${this.thread.peerName} (${this.thread.peerUniqueNum})`;
  }

  back() { this.router.navigate(['/user/chats']); }

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
    this.imgInput.nativeElement.click();
  }

  async onImage(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.thread) return;

    this.sending = true;
    try {
      const saved = await this.data.sendChatImage(this.thread.id, file);
      this.messages.push(saved);
      setTimeout(() => this.scrollArea?.scrollToBottom(200), 60);
    } catch (err: any) {
      this.toast(humanError(err, 'Could not send the photo'));
    } finally {
      this.sending = false;
      (e.target as HTMLInputElement).value = '';
    }
  }

  openRating() {
    this.router.navigate(['/user/rating'], { queryParams: { thread: this.thread?.id } });
  }

  async openMore() {
    const sheet = await this.sheetCtrl.create({
      header: this.title,
      buttons: [
        { text: 'Rate this seller', icon: 'star-outline', handler: () => this.openRating() },
        {
          text: 'Report this conversation', icon: 'flag-outline', role: 'destructive',
          handler: () => { this.report(); },
        },
        { text: 'Cancel', role: 'cancel' },
      ],
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