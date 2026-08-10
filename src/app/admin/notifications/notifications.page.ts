import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, IonFooter, IonRefresher, IonRefresherContent,
  AlertController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline, createOutline, notificationsOutline, timeOutline,
  informationCircleOutline, phonePortraitOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { DataService } from '../../shared/data.service';
import { humanError } from '../../shared/errors';
import { NotificationRule } from '../../shared/models';

/** Notification controls — L2. Switch each alert on or off and change when
 *  expiry reminders fire, without a code change. */
@Component({
  selector: 'app-admin-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon, IonFooter,
    IonRefresher, IonRefresherContent, AdminHeaderComponent,
  ],
})
export class AdminNotificationsPage implements OnInit {
  rules: NotificationRule[] = [];
  deviceCount = 0;
  loading = true;
  dirty = false;

  constructor(
    private data: DataService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      saveOutline, createOutline, notificationsOutline, timeOutline,
      informationCircleOutline, phonePortraitOutline,
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    try {
      const [rules, devices] = await Promise.all([
        this.data.getNotificationRules(),
        this.data.countDeviceTokens(),
      ]);
      this.rules = rules;
      this.deviceCount = devices;
    } catch (e) {
      this.toast(humanError(e, 'Could not load notification settings'));
    } finally {
      this.loading = false;
    }
  }

  async refresh(ev: CustomEvent) {
    await this.load();
    (ev.target as HTMLIonRefresherElement).complete();
  }

  toggle(r: NotificationRule) {
    r.enabled = !r.enabled;
    this.dirty = true;
  }

  /** Only expiry reminders have a timing; the rest fire on an event. */
  isTimed(r: NotificationRule) { return r.offsetDays !== null && r.offsetDays !== undefined; }

  async editTiming(r: NotificationRule) {
    const alert = await this.alertCtrl.create({
      header: r.title,
      subHeader: 'How many days before expiry should this be sent?',
      inputs: [{
        name: 'days', type: 'number', min: 0, max: 60,
        value: r.offsetDays ?? 0, placeholder: 'Days before',
      }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (d) => {
            const n = Number(d.days);
            if (!Number.isInteger(n) || n < 0 || n > 60) {
              this.toast('Enter a whole number between 0 and 60');
              return false;
            }
            r.offsetDays = n;
            this.dirty = true;
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async editText(r: NotificationRule) {
    const alert = await this.alertCtrl.create({
      header: 'Edit message',
      subHeader: 'Words in { } are filled in automatically.',
      inputs: [
        { name: 'title', type: 'text', value: r.title, placeholder: 'Title' },
        { name: 'body', type: 'textarea', value: r.bodyTemplate, placeholder: 'Message' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (d) => {
            if (!d.title?.trim() || !d.body?.trim()) return false;
            r.title = d.title.trim();
            r.bodyTemplate = d.body.trim();
            this.dirty = true;
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async save() {
    try {
      await this.data.saveNotificationRules(this.rules);
      this.dirty = false;
      this.toast('Notification settings saved');
    } catch (e) {
      this.toast(humanError(e, 'Could not save'));
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2400, position: 'bottom' });
    t.present();
  }
}
