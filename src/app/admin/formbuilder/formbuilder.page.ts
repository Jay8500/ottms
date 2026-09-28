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
import { humanError } from '../../shared/errors';

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

  async ngOnInit() {
    try {
      this.fields = await this.data.getFormFields();
    } catch (e) {
      this.toast(humanError(e, 'Could not load the sign-up form'));
    }
  }

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

  /**
   * A required field with no way to actually answer it — e.g. a text box
   * asking for a photo — blocks every single sign-up, silently, until
   * someone notices nobody can register. That happened once already: a
   * "Profile Photo" field, placeholder "Upload any photo", marked required.
   * Text/tel/email/password are the only field types this form can make;
   * there is no real upload field, so anything suggesting one is a trap.
   */
  private looksUnanswerable(f: FormField): boolean {
    const text = `${f.label} ${f.placeholder}`.toLowerCase();
    return /photo|image|upload|picture|signature|document|file|scan/.test(text);
  }

  async toggleRequired(f: FormField) {
    // Silently doing nothing here looked like the button was broken —
    // reported as "Profile pic ... Couldn't Work Required or Optional"
    // for a field that had just been switched off.
    if (!f.enabled) {
      this.toast(`Turn "${f.label}" on first — a hidden field cannot be required`);
      return;
    }

    if (!f.required && f.type === 'text' && this.looksUnanswerable(f)) {
      const alert = await this.alertCtrl.create({
        header: 'This field cannot be answered',
        message:
          `"${f.label}" is a plain text box — there is no real upload field in ` +
          `this form. Making it required means nobody can create an account ` +
          `until this is fixed, with no error explaining why.`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Make required anyway', role: 'destructive',
            handler: () => { f.required = true; this.dirty = true; },
          },
        ],
      });
      await alert.present();
      return;
    }

    // Mobile Number and Password are already required and cannot be turned
    // off (see toggleEnabled/remove below) — only warn about fields the
    // admin actually chose to add.
    const isSystemField = f.type === 'password' || f.label === 'Mobile Number';
    if (!f.required && !isSystemField) {
      const alert = await this.alertCtrl.create({
        header: 'Make this required?',
        message:
          `Nobody will be able to create an account without filling in ` +
          `"${f.label}". Only do this if you are sure every new user can ` +
          `and will answer it.`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Yes, require it', handler: () => { f.required = true; this.dirty = true; } },
        ],
      });
      await alert.present();
      return;
    }

    f.required = !f.required;
    this.dirty = true;
  }

  toggleOtp(f: FormField) {
    if (!f.otpCapable || !f.enabled) return;   // this control is not even shown when disabled
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
    try {
      for (const f of this.fields) await this.data.saveFormField(f);
      this.dirty = false;
      this.toast('Sign-up form updated');
    } catch (e) {
      this.toast(humanError(e, 'Could not save changes'));
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
}