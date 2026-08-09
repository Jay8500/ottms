import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  tvOutline, cameraOutline, personOutline, callOutline, mailOutline,
  happyOutline, lockClosedOutline, eyeOutline, eyeOffOutline, idCardOutline, addOutline,
} from 'ionicons/icons';
import { Auth } from '../../auth';
import { DataService } from '../../shared/data.service';
import { humanError } from '../../shared/errors';
import { FormField } from '../../shared/models';

@Component({
  selector: 'app-createaccnt',
  templateUrl: './createaccnt.page.html',
  styleUrls: ['./createaccnt.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner],
})
export class CreateaccntPage implements OnInit {
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  /** Driven by the admin Form Builder rather than hardcoded. */
  fields: FormField[] = [];
  values: Record<string, string> = {};

  showPwd = false;
  loading = false;
  error = '';
  avatarPreview: string | null = null;

  constructor(
    private auth: Auth,
    private data: DataService,
    private router: Router,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      tvOutline, cameraOutline, personOutline, callOutline, mailOutline,
      happyOutline, lockClosedOutline, eyeOutline, eyeOffOutline, idCardOutline, addOutline,
    });
  }

  async ngOnInit() {
    try {
      this.fields = (await this.data.getFormFields()).filter(f => f.enabled);
    } catch {
      this.error = 'Could not load the sign-up form. Check your connection.';
    }
    for (const f of this.fields) this.values[f.id] = '';
  }

  private valueOf(label: string) {
    const f = this.fields.find(x => x.label.toLowerCase() === label.toLowerCase());
    return f ? (this.values[f.id] ?? '').trim() : '';
  }

  pickAvatar() { this.avatarInput?.nativeElement.click(); }

  onAvatarSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.avatarPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  /** First thing that fails, or null when the form is good. */
  private validate(): string | null {
    for (const f of this.fields) {
      const v = (this.values[f.id] ?? '').trim();
      if (f.required && !v) return `${f.label} is required`;
      if (!v) continue;
      if (f.type === 'tel' && !/^\d{10}$/.test(v))   return 'Enter a valid 10-digit mobile number';
      if (f.type === 'email' && !v.includes('@'))    return 'Enter a valid email address';
      if (f.type === 'password' && v.length < 6)     return 'Password must be at least 6 characters';
    }
    return null;
  }

  get isValid() { return this.fields.length > 0 && this.validate() === null; }

  async createAccount() {
    this.error = '';
    const problem = this.validate();
    if (problem) { this.error = problem; return; }

    const mobile   = this.valueOf('Mobile Number');
    const password = this.valueOf('Password');
    const name     = this.valueOf('Full Name') || 'User';
    const email    = this.valueOf('Mail ID');

    this.loading = true;
    try {
      const { needsLogin } = await this.auth.signUp(mobile, password, name, email || undefined);

      const t = await this.toastCtrl.create({
        message: needsLogin
          ? 'Account created. Please sign in.'
          : `Welcome, ${name.split(' ')[0]}!`,
        duration: 2500, position: 'bottom', color: 'success',
      });
      await t.present();

      if (needsLogin) {
        this.router.navigate(['/login'], { replaceUrl: true });
      } else {
        this.router.navigate([`/${this.auth.role ?? 'user'}`], { replaceUrl: true });
      }
    } catch (e: any) {
      this.error = humanError(e, 'Could not create the account. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  goLogin() { this.router.navigate(['/login']); }
}