import { Component, OnInit } from '@angular/core';
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
import { FaqItem, LangCode, SocialLink } from '../../shared/models';

@Component({
  selector: 'app-support',
  templateUrl: './support.page.html',
  styleUrls: ['./support.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
})
export class SupportPage implements OnInit {
  lang: LangCode = 'en';
  faqs: FaqItem[] = [];
  links: SocialLink[] = [];
  loading = true;
  error = '';

  readonly langs: { code: LangCode; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'te', label: 'తెలుగు' },
  ];

  constructor(private router: Router, private data: DataService) {
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
      const [faqs, links] = await Promise.all([
        this.data.getFaqs(),
        this.data.getSocialLinks(),
      ]);
      this.faqs = faqs;
      this.links = links.filter(l => l.active);
    } catch (e) {
      this.error = 'Could not load help content.';
      console.error(e);
    } finally {
      this.loading = false;
    }
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