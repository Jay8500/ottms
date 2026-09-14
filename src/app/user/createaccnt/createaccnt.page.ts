import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  tvOutline, personOutline, callOutline, mailOutline, cameraOutline, addOutline,
  happyOutline, lockClosedOutline, eyeOutline, eyeOffOutline, idCardOutline,
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

  /** Kept in memory only — there is no account to upload to until signUp()
   *  succeeds, so the actual upload happens right after that. */
  avatarPreview: string | null = null;
  private avatarFile: File | null = null;

  constructor(
    private auth: Auth,
    private data: DataService,
    private router: Router,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      tvOutline, personOutline, callOutline, mailOutline, cameraOutline, addOutline,
      happyOutline, lockClosedOutline, eyeOutline, eyeOffOutline, idCardOutline,
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

  /**
   * People type their number as they say it: "+91 90595 42610",
   * "090595 42610", "9059542610". Strip it down to the ten digits rather
   * than rejecting a number that is perfectly correct.
   */
  private tidyPhoneNumbers() {
    for (const f of this.fields) {
      if (f.type !== 'tel') continue;
      let v = (this.values[f.id] ?? '').replace(/\D/g, '');
      if (v.length === 12 && v.startsWith('91')) v = v.slice(2);   // +91 …
      if (v.length === 11 && v.startsWith('0'))  v = v.slice(1);   // 0…
      this.values[f.id] = v;
    }
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

  pickAvatar() { this.avatarInput?.nativeElement.click(); }

  onAvatarSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.error = 'Photo must be under 5MB'; return; }
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => (this.avatarPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  async createAccount() {
    this.error = '';

    // The form is built from admin Form Builder rows. If that fetch failed
    // there is nothing to fill in, and validate() would wave an empty form
    // straight through to a sign-up with no mobile or password.
    if (!this.fields.length) {
      this.error = 'The sign-up form could not load. Check your connection and try again.';
      return;
    }

    this.tidyPhoneNumbers();

    const problem = this.validate();
    if (problem) { this.error = problem; return; }

    const mobile   = this.valueOf('Mobile Number');
    const password = this.valueOf('Password');
    const name     = this.valueOf('Full Name') || 'User';
    const email    = this.valueOf('Mail ID');

    this.loading = true;
    try {
      const { needsLogin } = await this.auth.signUp(mobile, password, name, email || undefined);

      // Only reachable once a real session exists — signUp() has already
      // loaded the profile by then, so currentUser.uniqueNumber is set.
      if (!needsLogin && this.avatarFile) {
        try { await this.auth.updateAvatar(this.avatarFile); }
        catch { /* the account is created either way; the photo can be added later from Profile */ }
      }

      const uid = this.auth.currentUser?.uniqueNumber;
      const t = await this.toastCtrl.create({
        message: needsLogin
          ? 'Account created. Please sign in.'
          : `Welcome, ${name.split(' ')[0]}! Your User ID is ${uid}.`,
        duration: 3200, position: 'bottom', color: 'success',
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