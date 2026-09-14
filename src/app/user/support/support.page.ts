import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  headsetOutline, chatbubblesOutline, logoWhatsapp, callOutline,
  chevronUpOutline, chevronDownOutline, arrowBackOutline, optionsOutline,
  playCircleOutline, documentTextOutline,
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

  /** Which format is showing per FAQ — text is the default, matching what
   *  most people tap first. */
  view: Record<string, 'text' | 'video'> = {};

  /** video() on the FAQ gives back the storage path saved by admin, not
   *  something a browser can open — support-videos is a private bucket, so
   *  it has to be signed. Resolved lazily, only for a video actually opened. */
  videoLink: Record<string, string> = {};
  resolvingVideo = false;

  constructor(private router: Router, private data: DataService, private sb: SupabaseService) {
    addIcons({
      headsetOutline, chatbubblesOutline, logoWhatsapp, callOutline,
      chevronUpOutline, chevronDownOutline, arrowBackOutline, optionsOutline,
      playCircleOutline, documentTextOutline,
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

  viewOf(f: FaqItem) { return this.view[f.id] ?? 'text'; }

  async setView(f: FaqItem, v: 'text' | 'video') {
    this.view[f.id] = v;
    f.open = true;
    if (v !== 'video' || this.videoLink[f.id]) return;

    const path = this.video(f);
    if (!path) return;
    this.resolvingVideo = true;
    try { this.videoLink[f.id] = await this.sb.signedUrl('support-videos', path); }
    catch { /* file removed or unreachable — the "Open video" link just stays hidden */ }
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

  openChat() { this.router.navigate(['/user/chats']); }
}