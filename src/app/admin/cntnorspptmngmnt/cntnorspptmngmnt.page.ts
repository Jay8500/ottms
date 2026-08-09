import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController, IonFooter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, trashOutline, addCircleOutline, saveOutline,
  playCircleOutline, cloudUploadOutline, documentTextOutline, checkmarkOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { DataService } from '../../shared/data.service';
import { FaqItem, LangCode } from '../../shared/models';

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

  readonly langs: { code: LangCode; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'te', label: 'Telugu' },
  ];

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      createOutline, trashOutline, addCircleOutline, saveOutline,
      playCircleOutline, cloudUploadOutline, documentTextOutline, checkmarkOutline,
    });
  }

  async ngOnInit() {
    this.faqs = await this.data.getFaqs();
    if (this.route.snapshot.queryParamMap.get('new')) this.add();
  }

  get langLabel() {
    return this.langs.find(l => l.code === this.lang)?.label ?? 'English';
  }

  /** How many of this FAQ's three translations are filled in. */
  filledCount(f: FaqItem) {
    return (['en', 'hi', 'te'] as LangCode[]).filter(l => f.q[l]?.trim() && f.a[l]?.trim()).length;
  }

  async editItem(f: FaqItem) {
    const alert = await this.alertCtrl.create({
      header: `Edit — ${this.langs.find(l => l.code === this.lang)?.label}`,
      inputs: [
        { name: 'q', type: 'textarea', value: f.q[this.lang] ?? '', placeholder: 'Question' },
        { name: 'a', type: 'textarea', value: f.a[this.lang] ?? '', placeholder: 'Answer' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (d) => {
            if (!d.q?.trim()) return false;
            f.q[this.lang] = d.q.trim();
            f.a[this.lang] = d.a?.trim() ?? '';
            this.dirty = true;
            return true;
          },
        },
      ],
    });
    await alert.present();
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

  onVideo(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.toast(`“${file.name}” selected — video hosting is not connected yet`);
  }

  async save() {
    for (const f of this.faqs) await this.data.saveFaq(f);
    this.dirty = false;
    this.toast('Support content saved');
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
}