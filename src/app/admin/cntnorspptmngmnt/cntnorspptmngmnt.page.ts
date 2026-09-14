import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent, IonIcon, AlertController, ToastController, IonFooter, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, trashOutline, addCircleOutline, saveOutline,
  playCircleOutline, cloudUploadOutline, documentTextOutline, checkmarkOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { DataService } from '../../shared/data.service';
import { SupabaseService } from '../../shared/supabase.service';
import { humanError } from '../../shared/errors';
import { FaqItem, LangCode } from '../../shared/models';
import { FaqEditorComponent } from './faq-editor/faq-editor.component';

/** 14 — Support. FAQ questions and answers in English, Hindi and Telugu,
 *  plus the explainer video for each language. */
@Component({
  selector: 'app-cntnorspptmngmnt',
  templateUrl: './cntnorspptmngmnt.page.html',
  styleUrls: ['./cntnorspptmngmnt.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, AdminHeaderComponent, IonFooter],
})
export class CntnorspptmngmntPage implements OnInit {
  lang: LangCode = 'en';
  mode: 'text' | 'video' = 'text';
  faqs: FaqItem[] = [];
  dirty = false;

  // In-App Chat and the two extra languages had no admin control at all —
  // both were unconditionally shown to every user. WhatsApp/CallUs already
  // toggle through Admin -> Follow Us (they are social_links rows).
  inAppChatEnabled = true;
  hiEnabled = true;
  teEnabled = true;
  private savingChannels = false;

  readonly langs: { code: LangCode; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'te', label: 'Telugu' },
  ];

  constructor(
    private data: DataService,
    private sb: SupabaseService,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
  ) {
    addIcons({
      createOutline, trashOutline, addCircleOutline, saveOutline,
      playCircleOutline, cloudUploadOutline, documentTextOutline, checkmarkOutline,
    });
  }

  async ngOnInit() {
    const [faqs, settings] = await Promise.all([
      this.data.getFaqs(),
      this.data.getSettings(),
    ]);
    this.faqs = faqs;
    this.inAppChatEnabled = settings['support_inapp_chat_enabled'] !== false;
    this.hiEnabled = settings['support_lang_hi_enabled'] !== false;
    this.teEnabled = settings['support_lang_te_enabled'] !== false;

    if (this.route.snapshot.queryParamMap.get('new')) this.add();
  }

  get langLabel() {
    return this.langs.find(l => l.code === this.lang)?.label ?? 'English';
  }

  /** How many of this FAQ's three translations are filled in. */
  filledCount(f: FaqItem) {
    return (['en', 'hi', 'te'] as LangCode[]).filter(l => f.q[l]?.trim() && f.a[l]?.trim()).length;
  }

  /** FAQs that have a video attached for the language currently selected —
   *  "so I can see which video uploaded". */
  get withVideo() {
    return this.faqs.filter(f => f.videoUrl?.[this.lang]?.trim());
  }

  async editItem(f: FaqItem) {
    const modal = await this.modalCtrl.create({
      component: FaqEditorComponent,
      componentProps: { faq: f, lang: this.lang, langLabel: this.langLabel },
      breakpoints: [0, 0.92],
      initialBreakpoint: 0.92,
      handle: false,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role !== 'save' || !data) return;

    f.q[this.lang] = data.question;
    f.a[this.lang] = data.answer;
    if (data.videoPath !== undefined) {
      f.videoUrl = f.videoUrl ?? { en: '', hi: '', te: '' };
      f.videoUrl[this.lang] = data.videoPath ?? '';
    }
    this.dirty = true;
    // Video uploads land in storage immediately, independent of Save below —
    // persist the row now so a page reload before Save does not lose it.
    try { await this.data.saveFaq(f); this.dirty = false; }
    catch (e) { this.toast(humanError(e, 'Saved locally — tap Save to sync')); }
  }

  async add() {
    const alert = await this.alertCtrl.create({
      header: 'New question',
      subHeader: 'Added in English. Switch language to translate it.',
      inputs: [
        { name: 'q', type: 'textarea', placeholder: 'Question' },
        { name: 'a', type: 'textarea', placeholder: 'Answer' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (d) => {
            if (!d.q?.trim()) return false;
            this.faqs.push({
              id: this.data.newId('faq'),
              q: { en: d.q.trim(), hi: '', te: '' },
              a: { en: d.a?.trim() ?? '', hi: '', te: '' },
              videoUrl: { en: '', hi: '', te: '' },
              position: this.faqs.length + 1,
            });
            this.dirty = true;
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async remove(f: FaqItem) {
    const alert = await this.alertCtrl.create({
      header: 'Delete question?',
      message: 'It is removed in all three languages.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: () => {
            this.faqs = this.faqs.filter(x => x.id !== f.id);
            this.dirty = true;
          },
        },
      ],
    });
    await alert.present();
  }

  async save() {
    for (const f of this.faqs) await this.data.saveFaq(f);
    this.dirty = false;
    this.toast('Support content saved');
  }

  // ── Channel toggles ──────────────────────────────────────────────────

  async toggleInAppChat() {
    this.inAppChatEnabled = !this.inAppChatEnabled;
    await this.saveChannel('support_inapp_chat_enabled', this.inAppChatEnabled);
  }

  async toggleLang(code: 'hi' | 'te') {
    if (code === 'hi') this.hiEnabled = !this.hiEnabled;
    else this.teEnabled = !this.teEnabled;
    await this.saveChannel(
      code === 'hi' ? 'support_lang_hi_enabled' : 'support_lang_te_enabled',
      code === 'hi' ? this.hiEnabled : this.teEnabled,
    );
  }

  private async saveChannel(key: string, value: boolean) {
    if (this.savingChannels) return;
    this.savingChannels = true;
    try {
      await this.data.saveSettings({ [key]: value });
    } catch (e) {
      this.toast(humanError(e, 'Could not save'));
    } finally {
      this.savingChannels = false;
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
}
