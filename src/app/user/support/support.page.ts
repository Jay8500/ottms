import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  headsetOutline, chatbubblesOutline, logoWhatsapp, callOutline,
  chevronUpOutline, chevronDownOutline, arrowBackOutline, optionsOutline,
} from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { SupabaseService } from '../../shared/supabase.service';
import { AppMenuService } from '../../shared/app-menu.service';
import { FaqItem, LangCode, SocialLink } from '../../shared/models';

@Component({
  selector: 'app-support',
  templateUrl: './support.page.html',
  styleUrls: ['./support.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class SupportPage implements OnInit {
  private appMenu = inject(AppMenuService);
  openMenu() { this.appMenu.open(); }

  lang: LangCode = 'en';
  faqs: FaqItem[] = [];
  links: SocialLink[] = [];
  loading = true;
  error = '';

  inAppChatEnabled = true;
  langs: { code: LangCode; label: string }[] = [];
  private readonly allLangs: { code: LangCode; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'te', label: 'తెలుగు' },
  ];

  /** video() on the FAQ gives back the storage path saved by admin, not
   *  something a browser can open — support-videos is a private bucket, so
   *  it has to be signed. Resolved lazily, only once a question is opened,
   *  not for every FAQ on page load. */
  videoLink: Record<string, string> = {};
  resolvingVideo = false;

  constructor(private router: Router, private data: DataService, private sb: SupabaseService) {
    addIcons({
      headsetOutline, chatbubblesOutline, logoWhatsapp, callOutline,
      chevronUpOutline, chevronDownOutline, arrowBackOutline, optionsOutline,
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const [faqs, links, settings] = await Promise.all([
        this.data.getFaqs(),
        this.data.getSocialLinks(),
        this.data.getSettings(),
      ]);
      this.faqs = faqs;
      this.links = links.filter(l => l.active);

      this.inAppChatEnabled = settings['support_inapp_chat_enabled'] !== false;
      this.langs = this.allLangs.filter(l =>
        l.code === 'en'
        || (l.code === 'hi' && settings['support_lang_hi_enabled'] !== false)
        || (l.code === 'te' && settings['support_lang_te_enabled'] !== false));
      if (!this.langs.some(l => l.code === this.lang)) this.lang = 'en';
    } catch (e) {
      this.error = 'Could not load help content.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  /** Each line of the answer becomes its own bullet point. */
  points(f: FaqItem): string[] {
    return this.a(f).split('\n').map(s => s.trim()).filter(Boolean);
  }

  /** Text and video show together now, not as a tap-to-switch choice —
   *  resolving the video's real link happens here, the moment the question
   *  is actually opened, rather than for every FAQ up front. */
  async toggleOpen(f: FaqItem) {
    f.open = !f.open;
    if (!f.open || this.videoLink[f.id]) return;

    const path = this.video(f);
    if (!path) return;
    this.resolvingVideo = true;
    try { this.videoLink[f.id] = await this.sb.signedUrl('support-videos', path); }
    catch { /* file removed or unreachable — the player just stays hidden */ }
    finally { this.resolvingVideo = false; }
  }

  back() { this.router.navigate(['/user/home']); }

  /** Falls back to English when a translation is missing. */
  q(f: FaqItem) { return f.q[this.lang]?.trim() || f.q.en; }
  a(f: FaqItem) { return f.a[this.lang]?.trim() || f.a.en; }
  video(f: FaqItem) { return f.videoUrl?.[this.lang]?.trim() || f.videoUrl?.en || ''; }

  /** True when this entry has no copy in the chosen language. */
  untranslated(f: FaqItem) { return !f.q[this.lang]?.trim(); }

  openLink(l: SocialLink) { window.open(l.url, '_system'); }

  /** Talks to the App Team, not the user's trade chats — this button lives
   *  next to WhatsApp and Call Us for a reason. */
  startingChat = false;
  async openChat() {
    if (this.startingChat) return;
    this.startingChat = true;
    try {
      const threadId = await this.data.startSupportChat();
      this.router.navigate(['/user/chat'], { queryParams: { thread: threadId } });
    } catch (e) {
      this.error = 'Could not start the chat. Check your connection and try again.';
    } finally {
      this.startingChat = false;
    }
  }
}