import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController, ToastController, IonFooter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, trashOutline, addOutline, saveOutline, cameraOutline,
  informationCircleOutline, arrowUpOutline, arrowDownOutline,
  personOutline, happyOutline, callOutline, mailOutline, lockClosedOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { DataService } from '../../shared/data.service';
import { FormField } from '../../shared/models';

/** 1 — Create Account/Group. Controls which fields appear on the sign-up form,
 *  their order, whether they are required, and which need OTP verification. */
@Component({
  selector: 'app-admin-formbuilder',
  templateUrl: './formbuilder.page.html',
  styleUrls: ['./formbuilder.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, AdminHeaderComponent, IonFooter],
})
export class AdminFormbuilderPage implements OnInit {
  fields: FormField[] = [];
  dirty = false;

  constructor(
    private data: DataService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      createOutline, trashOutline, addOutline, saveOutline, cameraOutline,
      informationCircleOutline, arrowUpOutline, arrowDownOutline,
      personOutline, happyOutline, callOutline, mailOutline, lockClosedOutline,
    });
  }

  async ngOnInit() { this.fields = await this.data.getFormFields(); }

  /** Arrow reordering rather than drag — reliable inside a scrolling WebView. */
  move(f: FormField, dir: -1 | 1) {
    const i = this.fields.indexOf(f);
    const j = i + dir;
    if (j < 0 || j >= this.fields.length) return;
    [this.fields[i], this.fields[j]] = [this.fields[j], this.fields[i]];
    this.fields.forEach((x, n) => (x.position = n + 1));
    this.dirty = true;
  }

  toggleEnabled(f: FormField) {
    if (f.type === 'password' && f.enabled) {
      this.toast('Password cannot be switched off — it is how people sign in');
      return;
    }
    f.enabled = !f.enabled;
    if (!f.enabled) { f.required = false; f.requireOtp = false; }
    this.dirty = true;
  }

  toggleRequired(f: FormField) {
    if (!f.enabled) return;
    f.required = !f.required;
    this.dirty = true;
  }

  toggleOtp(f: FormField) {
    if (!f.otpCapable || !f.enabled) return;
    f.requireOtp = !f.requireOtp;
    this.dirty = true;
  }

  async rename(f: FormField) {
    const alert = await this.alertCtrl.create({
      header: 'Edit field',
      inputs: [
        { name: 'label', type: 'text', value: f.label, placeholder: 'Label' },
        { name: 'placeholder', type: 'text', value: f.placeholder, placeholder: 'Placeholder text' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (d) => {
            if (!d.label?.trim()) return false;
            f.label = d.label.trim();
            f.placeholder = d.placeholder?.trim() || d.label.trim();
            this.dirty = true;
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async remove(f: FormField) {
    if (f.type === 'password' || f.label === 'Mobile Number') {
      this.toast(`${f.label} is needed to create an account and cannot be removed`);
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Remove field?',
      message: `“${f.label}” disappears from the sign-up form. Details already collected are kept.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove', role: 'destructive',
          handler: () => {
            this.fields = this.fields.filter(x => x.id !== f.id);
            this.dirty = true;
          },
        },
      ],
    });
    await alert.present();
  }

  async addField() {
    const alert = await this.alertCtrl.create({
      header: 'Add field',
      inputs: [
        { name: 'label', type: 'text', placeholder: 'Label e.g. City' },
        { name: 'placeholder', type: 'text', placeholder: 'Placeholder text' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (d) => {
            if (!d.label?.trim()) return false;
            this.fields.push({
              id: this.data.newId('fld'),
              label: d.label.trim(),
              placeholder: d.placeholder?.trim() || d.label.trim(),
              icon: 'create-outline', iconBg: '#EEEEEE', type: 'text',
              required: false, enabled: true, requireOtp: false, otpCapable: false,
              position: this.fields.length + 1,
            });
            this.dirty = true;
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async save() {
    for (const f of this.fields) await this.data.saveFormField(f);
    this.dirty = false;
    this.toast('Sign-up form updated');
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
}