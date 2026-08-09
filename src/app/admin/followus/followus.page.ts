import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonFooter, AlertController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, addCircleOutline, eyeOffOutline, openOutline,
  logoWhatsapp, logoInstagram, logoYoutube, logoFacebook, logoLinkedin,
  paperPlaneOutline, linkOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { EntityEditorComponent } from '../shared/entity-editor.component';
import { DataService } from '../../shared/data.service';
import { humanError } from '../../shared/errors';
import { CmsEntity, SocialLink } from '../../shared/models';

/** 16 — Follow Us. Social and community links shown on the Support screen. */
@Component({
  selector: 'app-admin-followus',
  templateUrl: './followus.page.html',
  styleUrls: ['./followus.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon, IonFooter,
    AdminHeaderComponent, EntityEditorComponent,
  ],
})
export class AdminFollowusPage implements OnInit {
  items: SocialLink[] = [];
  editing: SocialLink | null = null;
  editorOpen = false;
  isNew = false;
  loading = true;

  readonly icons = [
    'logo-whatsapp', 'logo-instagram', 'logo-youtube',
    'logo-facebook', 'logo-linkedin', 'paper-plane-outline', 'link-outline',
  ];

  constructor(
    private data: DataService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      createOutline, addCircleOutline, eyeOffOutline, openOutline,
      logoWhatsapp, logoInstagram, logoYoutube, logoFacebook, logoLinkedin,
      paperPlaneOutline, linkOutline,
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    try {
      this.items = await this.data.getSocialLinks();
    } catch (e) {
      this.toast(humanError(e, 'Could not load links'));
    } finally {
      this.loading = false;
    }
  }

  async refresh(ev: CustomEvent) {
    await this.load();
    (ev.target as HTMLIonRefresherElement).complete();
  }

  create() {
    this.isNew = true;
    this.editing = {
      id: this.data.newId('soc'), title: '', url: '',
      color: '#25D366', icon: 'link-outline',
      position: this.items.length + 1, active: true,
    };
    this.editorOpen = true;
  }

  edit(s: SocialLink) {
    this.isNew = false;
    this.editing = { ...s };
    this.editorOpen = true;
  }

  open(s: SocialLink) { window.open(s.url, '_system'); }

  async onSave(e: CmsEntity) {
    const link = e as SocialLink;
    const url = link.url?.trim() ?? '';

    if (!url) { this.toast('Enter the link address'); return; }
    if (!/^https?:\/\//i.test(url)) {
      this.toast('Link must start with http:// or https://');
      return;
    }

    link.url = url;
    try {
      await this.data.saveSocialLink(link);
      await this.load();
      this.editorOpen = false;
      this.toast(this.isNew ? 'Link added' : 'Link updated');
    } catch (err) {
      this.toast(humanError(err, 'Could not save'));
    }
  }

  async onRemove(id: string) {
    const s = this.items.find(x => x.id === id);
    const alert = await this.alertCtrl.create({
      header: 'Remove link?',
      message: `“${s?.title}” disappears from the Support screen.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove', role: 'destructive',
          handler: async () => {
            try {
              await this.data.deleteSocialLink(id);
              await this.load();
              this.editorOpen = false;
              this.toast('Link removed');
            } catch (e) {
              this.toast(humanError(e, 'Could not remove'));
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2400, position: 'bottom' });
    t.present();
  }
}